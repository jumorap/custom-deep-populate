const { isEmpty, merge } = require("lodash/fp");

const getModelPopulationAttributes = (model) => {
  if (model.uid === "plugin::upload.file") {
    const { related, ...attributes } = model.attributes;
    // console.log("attributes", attributes)
    return attributes;
  }

  // console.log("model.attributes", model.attributes)
  return model.attributes;
};

const getFullPopulateObject = (modelUid, maxDepth = 20, ignore) => {
  const skipCreatorFields = strapi.plugin('custom-deep-populate')?.config('skipCreatorFields');

  if (maxDepth <= 1) {
    // console.log("maxDepth reached", maxDepth)
    return true;
  }
  if (modelUid === "admin::user" && skipCreatorFields) {
    // console.log("skipCreatorFields", skipCreatorFields, modelUid)
    return undefined;
  }

  const populate = {};
  const model = strapi.getModel(modelUid);
  if (ignore && !ignore.includes(model.collectionName)) ignore.push(model.collectionName)
  for (const [key, value] of Object.entries(
    getModelPopulationAttributes(model)
  )) {
    if (ignore?.includes(key)) continue
    if (value) {
      if (value.type === "component") {
        populate[key] = getFullPopulateObject(value.component, maxDepth - 1);
      } else if (value.type === "dynamiczone") {
        const dynamicPopulate = value.components.reduce((prev, cur) => {
          const curPopulate = getFullPopulateObject(cur, maxDepth - 1);
          // console.log("curPopulate", curPopulate)
          return curPopulate === true ? prev : merge(prev, curPopulate);
        }, {});
        populate[key] = isEmpty(dynamicPopulate) ? true : dynamicPopulate;
      } else if (value.type === "relation") {
        const relationPopulate = getFullPopulateObject(
          value.target,
          (key === 'localizations') && maxDepth > 2 ? 1 : maxDepth - 1,
          ignore
        );
        if (relationPopulate) {
          populate[key] = relationPopulate;
        }
      } else if (value.type === "media") {
        populate[key] = true;
      }
    }
  }
  // console.log("populate", populate)
  return isEmpty(populate) ? true : { populate };
};

module.exports = {
  getFullPopulateObject
}
