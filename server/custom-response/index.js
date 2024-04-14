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

const removeImageFields = (obj, keepFields) => {
  /**
   * If the object has the fields: height, width and url, we can assume that it is an image and return the
   * fields defined in keepFields. If there is a field that is not in the object, it will be ignored.
   * @param {Object} obj - The object to be checked
   * @param {Array} keepFields - The fields to be kept in the image object
   * @returns {Object} - The object with the image fields removed
   */
  if (obj)
    if (obj.height && obj.width && obj.url) {
      const newObject = {};

      keepFields.forEach(field => {
        if (obj[field]) newObject[field] = obj[field];
      });

      return newObject;
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

const objectCustomizer = (obj, fieldsToRemove, pickedFieldsInImage, removeNestedFieldsWithSameName) => {
  /**
   * If the object has nested objects, we need to iterate over them using recursion to remove the fields
   * with removeGenericFields, removeSameNameInNestedFields and removeImageFields functions and return
   * the object cleaned.
   * @param {Object} obj - The object to be cleaned
   * @param {Array} fieldsToRemove - The fields to be removed from the object
   * @param {Array} pickedFieldsInImage - The fields to be kept in the image object
   * @param {Boolean} removeNestedFieldsWithSameName - If true, the child will be replaced by the child's child
   * @returns {Object} - The object cleaned
   */
  if (typeof obj === "object") {
    for (let key in obj)
      if (obj[key] !== null && typeof obj[key] === "object")
        obj[key] = objectCustomizer(
          obj[key],
          fieldsToRemove,
          pickedFieldsInImage,
          removeNestedFieldsWithSameName
        );

    if (fieldsToRemove.length > 0) obj = removeGenericFields(obj, fieldsToRemove);
    if (removeNestedFieldsWithSameName) obj = removeSameNameInNestedFields(obj);
    if (pickedFieldsInImage.length > 0) obj = removeImageFields(obj, pickedFieldsInImage);
  }

  return obj;
}

const customResponseGenerator = async (
  strapi,
  model,
  apiRefUid,
  unnecessaryFields,
  pickedFieldsInImage,
  removeNestedFieldsWithSameName
) => {
  /**
   * Generate a custom response from the query response.
   * @param {Object} strapi - The strapi object
   * @param {Object} model - The model to be populated
   * @param {String} apiRefUid - The API reference UID
   * @param {Array} unnecessaryFields - The fields to be removed from the object
   * @param {Array} pickedFieldsInImage - The fields to be kept in the image object
   * @param {Boolean} removeNestedFieldsWithSameName - If true, the child will be replaced by the child's child
   * @returns {Object} - The custom response
   */
  const ctx = strapi.requestContext.get();
  const queryResponse = await strapi.db.query(apiRefUid).findMany({populate: model});

  let queryResponseCleaned = queryResponse[0];
  queryResponseCleaned = JSON.parse(JSON.stringify(queryResponseCleaned));

  queryResponseCleaned = objectCustomizer(
    queryResponseCleaned,
    unnecessaryFields,
    pickedFieldsInImage,
    removeNestedFieldsWithSameName
  );

  ctx.body = {
    customData: queryResponseCleaned,
  };
};

module.exports = {
  customResponseGenerator
};
