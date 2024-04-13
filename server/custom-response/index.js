const removeGenericFields = (obj, fields) => {
  /**
   * Remove the fields from the object.
   * @param {Object} obj - The object to be cleaned
   * @param {Array} fields - The fields to be removed from the object
   * @returns {Object} - The object cleaned
   */
  fields.forEach(field => {
    if (obj[field]) delete obj[field];
  });

  return obj;
}

const removeImageFields = (obj) => {
  /**
   * If the object has the fields height, width and url, we can assume that it is an image and return only the url.
   * @param {Object} obj - The object to be checked
   * @returns {Object} - The object with the image fields removed
   */
  if (obj)
    if (obj.height && obj.width && obj.url) {
      obj = {
        url: obj.url,
        alt: obj.alternativeText
      }
    }

  return obj;
}

const removeSameNameInNestedFields = (obj) => {
  /**
   * Trace the child of the object 1 level deep (if it has) and inside the child check child's
   * if true, replace in the object the child with the child's child, return the object in any case
   * @param {Object} obj - The object to be checked
   * @returns {Object} - The object with the child replaced if the child has the same key as the child's child
   */
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null && key in obj[key]) {
      obj[key] = obj[key][key];
      return removeSameNameInNestedFields(obj);
    }
  }

  return obj;
}

const objectCustomizer = (obj, fieldsToRemove, removeExtraImageFields, removeNestedFieldsWithSameName) => {
  /**
   * If the object has nested objects, we need to iterate over them using recursion to remove the fields
   * with removeGenericFields, removeSameNameInNestedFields and removeImageFields functions and return
   * the object cleaned.
   * @param {Object} obj - The object to be cleaned
   * @param {Array} fieldsToRemove - The fields to be removed from the object
   * @param {Boolean} removeExtraImageFields - If true, only the url and alt fields will be returned
   * @param {Boolean} removeNestedFieldsWithSameName - If true, the child will be replaced by the child's child
   * @returns {Object} - The object cleaned
   */
  if (typeof obj === "object") {
    for (let key in obj)
      if (obj[key] !== null && typeof obj[key] === "object")
        obj[key] = objectCustomizer(obj[key], fieldsToRemove, removeExtraImageFields, removeNestedFieldsWithSameName);


    if (fieldsToRemove.length > 0) obj = removeGenericFields(obj, fieldsToRemove);
    if (removeNestedFieldsWithSameName) obj = removeSameNameInNestedFields(obj);
    if (removeExtraImageFields) obj = removeImageFields(obj);
  }

  return obj;
}

const customResponseGenerator = async (strapi, model) => {
  /**
   * Generate a custom response from the query response.
   * @param {Object} strapi - The strapi object
   * @param {Object} model - The model to be populated
   * @returns {Object} - The custom response
   */
  const fieldsToRemove = ["createdAt", "updatedAt", "publishedAt", "createdBy", "updatedBy"];

  const unnecessaryFields = strapi.plugin('custom-deep-populate')?.config('unnecessaryFields') || fieldsToRemove;
  const removeExtraImageFields = strapi.plugin('custom-deep-populate')?.config('removeExtraImageFields') || true;
  const removeNestedFieldsWithSameName = strapi.plugin('custom-deep-populate')?.config('removeNestedFieldsWithSameName') || true;

  const ctx = strapi.requestContext.get();
  const apiRef = ctx.request.url.split('/')[2].split('?')[0];
  const queryResponse = await strapi.db.query(`api::${apiRef}.${apiRef}`).findMany({populate: model})

  let queryResponseCleaned = queryResponse[0];
  queryResponseCleaned = JSON.parse(JSON.stringify(queryResponseCleaned));

  queryResponseCleaned = objectCustomizer(queryResponseCleaned, unnecessaryFields, removeExtraImageFields, removeNestedFieldsWithSameName);

  ctx.body = {
    customData: queryResponseCleaned,
  };
}

module.exports = {
  customResponseGenerator
}
