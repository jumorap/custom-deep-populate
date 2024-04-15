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
      populate[key] = getFullPopulateObject(value.component, maxDepth - 1);
      break;
    case "dynamiczone":
      const dynamicPopulate = getDynamicPopulate(value.components, maxDepth);
      populate[key] = isEmpty(dynamicPopulate) ? true : dynamicPopulate;
      break;
    case "relation":
      const relationPopulate = getRelationPopulate(value.target, key, maxDepth, ignore);
      if (relationPopulate) populate[key] = relationPopulate;
      break;
    case "media":
      populate[key] = true;
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

const getFullPopulateObject = (modelUid, maxDepth=20, ignore=[]) => {
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
  if (ignore && !ignore.includes(model.collectionName)) ignore.push(model.collectionName)
  for (const [key, value] of Object.entries(
    getModelPopulationAttributes(model)
  )) {
    if (ignore?.includes(key)) continue;
    populate = populateKey(populate, key, value, maxDepth, ignore);
  }

  return isEmpty(populate) ? true : { populate };
};

module.exports = {
  getFullPopulateObject
}
