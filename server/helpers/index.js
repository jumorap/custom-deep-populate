const { isEmpty, merge } = require("lodash/fp");

const getModelPopulationAttributes = (model) => {
  /**
   * Get the population attributes for the given model
   * @param {Object} model - The model object to get the population attributes for
   * @returns {Object} - The population attributes
   */
  if (model.uid === "plugin::upload.file") {
    const { related, ...attributes } = model.attributes;

    return attributes;
  }

  return model.attributes;
};

const populateKey = (populate, key, value, maxDepth, ignore) => {
  /**
   * Populate the given key with the given value, maxDepth level and 'ignore' array if provided.
   * Checking the value type and populating accordingly, each key is populated with the full populated object,
   * and depending on the type of the value, the populated object is updated accordingly.
   * @param {Object} populate - The object to populate the key with
   * @param {String} key - The key to populate
   * @param {Object} value - The value to populate
   * @param {Number} maxDepth - The maximum depth to populate
   * @param {Array} ignore - The collection names to ignore
   * @returns {Object} - The populated object
   */
  if (!value) return populate;

  switch (value.type) {
    case "component":
      populate[key] = {
        pushOn: getFullPopulateObject(value.component, maxDepth - 1),
        type: value.type
      };
      break;
    case "dynamiczone":
      const dynamicPopulate = getDynamicPopulate(value.components, maxDepth);
      populate[key] = {
        pushOn: isEmpty(dynamicPopulate) ? true : dynamicPopulate,
        type: value.type
      };
      break;
    case "relation":
      const relationPopulate = getRelationPopulate(value.target, key, maxDepth, ignore);
      if (relationPopulate) populate[key] = {
        pushOn: relationPopulate,
        type: value.type
      };
      break;
    case "media":
      populate[key] = {
        pushOn: true,
        type: value.type
      };
      break;
  }

  return populate;
}

const getDynamicPopulate = (components, maxDepth) => {
  /**
   * Get the dynamic population for the given components and maxDepth level
   * @param {Array} components - The components to populate
   * @param {Number} maxDepth - The maximum depth to populate
   * @returns {Object} - The populated object
   */
  return components.reduce((prev, cur) => {
    const curPopulate = getFullPopulateObject(cur, maxDepth - 1);
    return curPopulate === true ? prev : merge(prev, curPopulate);
  }, {});
};

const getRelationPopulate = (target, key, maxDepth, ignore) => {
  /**
   * Get the relation population for the given target, key, maxDepth level and ignore array if provided
   * @param {String} target - The target to populate
   * @param {String} key - The key to populate
   * @param {Number} maxDepth - The maximum depth to populate
   * @param {Array} ignore - The collection names to ignore
   * @returns {Object} - The populated object
   */
  return getFullPopulateObject(
    target,
    (key === 'localizations') && maxDepth > 2 ? 1 : maxDepth - 1,
    ignore
  );
};

const getFullPopulateObject = (modelUid, maxDepth=20, ignore=[], specific=[]) => {
  /**
   * Get the populated object for the given modelUid and maxDepth level, ignoring the given collection
   * names in the 'ignore' array if provided
   * @param {String} modelUid - The model uid to get the populated object for
   * @param {Number} maxDepth - The maximum depth to populate
   * @param {Array} ignore - The collection names to ignore
   * @returns {Object} - The populated object
   */
  const skipCreatorFields = strapi.plugin('custom-deep-populate')?.config('skipCreatorFields');

  if (maxDepth <= 1) return true;
  if (modelUid === "admin::user" && skipCreatorFields) return undefined;

  let populate = {};
  const model = strapi.getModel(modelUid);

  if (ignore && !ignore.includes(model.collectionName)) ignore.push(model.collectionName);

  for (const [key, value] of Object.entries(
    getModelPopulationAttributes(model)
  )) {
    if (ignore?.includes(key)) continue;
    if (specific.length > 0 && specific.includes(key)) {
      populate = populateKey(populate, key, value, maxDepth, ignore);
      continue;
    }
    if (specific.length === 0) populate = populateKey(populate, key, value, maxDepth, ignore);
  }

  return isEmpty(populate) ? true : { populate };
};

const setFalseNoMedia = (model, imageInline) => {
  /**
   * Reach the deepest level of the model object in each key and set the pushOn to false in each child
   * if the type of each child is not media and the field pushOn is not an object
   * @param model - The model object
   * @returns {Object} - The model object with the pushOn value as the field value in each key
   */
  if (imageInline) return model;

  const keys = Object.keys(model.populate);
  for (const element of keys) {
    const key = element;
    const value = model.populate[key];
    if (value.type !== 'media' && typeof value.pushOn !== 'object') {
      if (value.type !== 'relation') {
        model.populate[key].pushOn = false;
        delete model.populate[key].pushOn;
      }
    } else if (value.type === 'component') {
      setFalseNoMedia(value.pushOn);
    }
  }

  return redefinePushOnFields(model);
};

const redefinePushOnFields = (model) => {
  /**
   * Browse the model and set the pushOn value as the field value in each key
   * F.E: { "hero": { "pushOn": true, "type": "component" } } => { "hero": true }
   * F.E: { "hero": { "pushOn": { "populate": { "image": { "pushOn": true, "type": "media" } } }, "type": "component" } } => { "hero": { "populate" { "image": true } } }
   * F.E: {"imagebase": { "pushOn": true, "type": "media" } } => { "imagebase": true }
   * F.E: { "imagecomponent": { "pushOn": { "populate": { "imageincomponent": { "pushOn": true, "type": "media" }, "image4": { "pushOn": { "populate": { "image4": { "pushOn": true, "type": "media" }, "hero": { "pushOn": true, "type": "component" } } }, "type": "component" }, "hero": { "pushOn": { "populate": { "image": { "pushOn": true, "type": "media" }, "icon": { "pushOn": true, "type": "relation" } } }, "type": "component" } } }, "type": "component" } } => { "imagecomponent": { "populate": { "imageincomponent": true, "image4": { "populate": { "image4": true, "hero": true } }, "hero": { "populate": { "image": true, "icon": true } } } } }
   * @param model - The model object
   * @returns {Object} - The model object with the pushOn value as the field value in each key
   */
  const result = {};

  const populateKeys = Object.keys(model.populate);
  populateKeys.forEach(key => {
    const value = model.populate[key];
    if (typeof value.pushOn === 'boolean') {
      result[key] = value.pushOn;
    } else if (typeof value.pushOn === 'object' && value.pushOn.populate) {
      result[key] = redefinePushOnFields(value.pushOn);
    }
  });

  return {populate: result};
};

module.exports = {
  getFullPopulateObject,
  setFalseNoMedia
};
