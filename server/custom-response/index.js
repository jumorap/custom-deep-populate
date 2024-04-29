const fs = require('fs');
const files = fs.readdirSync('./src/api');


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
  if (obj?.height && obj?.width && obj?.url) {
    const newObject = {};

    keepFields.forEach(field => {
      if (obj[field]) newObject[field] = obj[field];
    });

    return newObject;
  }

  return obj;
}

const removeSameNameInNestedFields = (obj, collection) => {
  /**
   * Trace the child of the object 1 level deep (if it has) and inside the child check child's
   * if true, replace in the object the child with the child's child, return the object in any case
   * @param {Object} obj - The object to be checked
   * @param {Array} collection - The list of Collection and Single Types to check to remove
   * @returns {Object} - The object with the child replaced if the child has the same key as the child's child
   */
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null && key in obj[key] && collection.includes(key)) {
      obj[key] = obj[key][key];
      removeSameNameInNestedFields(obj, collection);
    }
  }

  return obj;
}

const removeCollectionNamesInNested = (obj, collection) => {
  /**
   * Trace the child of the object 1 level deep (if it has), only one child and inside the child check child's key
   * using the collection if the key is included, replace in the object the child with the child's value, return
   * the object in any case.
   * From: { "key": { "inCollectionNameName": "value" } } To: { "key": "value" }
   * @param {Object} obj - The object to be checked
   * @param {Array} collection - The list of Collection and Single Types to check to remove
   * @returns {Object} - The object with the child replaced if the child has the same key as the child's child
   */
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      const childKeys = Object.keys(obj[key]);
      if (childKeys.length === 1 && collection.includes(childKeys[0])) obj[key] = obj[key][childKeys[0]];
    }
  }

  return obj;
}

const objectCustomizer = (
  obj,
  fieldsToRemove,
  pickedFieldsInImage,
  removeNestedFieldsWithSameName,
  collectionNSingleTypes
) => {
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
          removeNestedFieldsWithSameName,
          collectionNSingleTypes
        );

    if (fieldsToRemove.length > 0) obj = removeGenericFields(obj, fieldsToRemove);
    if (removeNestedFieldsWithSameName) obj = removeSameNameInNestedFields(obj, collectionNSingleTypes);
    if (collectionNSingleTypes.length > 0 && removeNestedFieldsWithSameName) obj = removeCollectionNamesInNested(obj, collectionNSingleTypes);
    if (pickedFieldsInImage.length > 0) obj = removeImageFields(obj, pickedFieldsInImage);
  }

  return obj;
}

// const populateComponent = async (strapi, apiRefUid, model, event, componentList=["boton"]) => {
/**
 * Populate only the components that are in the componentList array.
 * Check each field in model and if it is in the componentList, populate it and just it.
 * If the key is in the componentList, the model is updated, and the fields that are not in
 * the componentList are removed from model, and the component is populated.
 * The model can have a deeply nested object, so we need to iterate over the object using recursion.
 * @param {String} apiRefUid - The API reference UID
 * @param {Object} model - The model to be populated
 * @param {Array} componentList - The list of components to populate
 */
  // event.params.where = {$and: [{boton: {'$null': false}}]}
  // return await strapi.db.query(apiRefUid).findMany(event.params);
// }


const makeQueries = async (strapi, event, model, apiRefUid) => {
    /**
     * Make the queries to the database, redefine the 'where' clause if necessary and return the response.
     * @param {Object} strapi - The strapi object
     * @param {Object} event - The event from the lifecycle hook
     * @param {Object} model - The model to be populated
     */
    let setWhere = event.params?.where; // {} -> locale, etc...
    const publishFalse = {publishedAt: { '$null': false }};
    if (!setWhere?.$and) setWhere = { $and: [publishFalse] };
    else setWhere = { $and: [...setWhere.$and, publishFalse] };

    event.params.populate = model;
    event.params.where = setWhere;

    let queryResponse = await strapi.db.query(apiRefUid).findMany(event.params);
    // IMPORTANT!
    // When the query doesn't match with the 'where' clause in db,
    // we need to query without it as if it was a default query.
    if (queryResponse.length < 1) {
      event.params.where = {};
      queryResponse = await strapi.db.query(apiRefUid).findMany(event.params);
    }

    return queryResponse.length > 1 ? queryResponse : queryResponse[0];
  }

const getMeta = async (event, apiRefUid) => {
  /**
   * Generate the meta object with the pagination data.
   * @param {Object} event - The event from the lifecycle hook
   * @param {String} apiRefUid - The API reference UID
   * @returns {Object} - The meta object
   */
  let meta = {};

  if (event?.params?.limit) {
    const [data, counter] = await strapi.db.query(apiRefUid).findWithCount({limit: 1});

    meta = {
      pagination:{
        pageSize: event?.params?.limit,
        page: event?.params?.offset + 1,
        total: counter,
        pageCount: Math.ceil(counter / event?.params?.limit)
      }
    };
  }

  return meta;
}

const customResponseGenerator = async (
  strapi,
  event,
  model,
  apiRefUid,
  unnecessaryFields,
  pickedFieldsInImage,
  removeNestedFieldsWithSameName
) => {
  /**
   * Generate a custom response from the query response.
   * @param {Object} strapi - The strapi object
   * @param {Object} event - The event from the lifecycle hook
   * @param {Object} model - The model to be populated
   * @param {String} apiRefUid - The API reference UID
   * @param {Array} unnecessaryFields - The fields to be removed from the object
   * @param {Array} pickedFieldsInImage - The fields to be kept in the image object
   * @param {Boolean} removeNestedFieldsWithSameName - If true, the child will be replaced by the child's child
   * @returns {Object} - The custom response
   */
  const ctx = strapi.requestContext.get();
  const collectionNSingleTypes = files.slice(1, files.length).map(file => file);

  const queryResponseCleaned = await makeQueries(strapi, event, model, apiRefUid);
  const meta = await getMeta(event, apiRefUid);

  const cleanedResponse = objectCustomizer(
    queryResponseCleaned,
    unnecessaryFields,
    pickedFieldsInImage,
    removeNestedFieldsWithSameName,
    collectionNSingleTypes
  );

  ctx.send({
    customData: cleanedResponse,
    meta: meta
  });
};

module.exports = {
  customResponseGenerator
};
