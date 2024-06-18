const fs = require('fs');
const files = fs.readdirSync('./src/api');
const { getFullPopulateObject } = require('../helpers');


let speFields = [];


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

const removeImageFields = (obj, keepFields, imageFormats) => {
  /**
   * If the object has the fields: height, width and url, we can assume that it is an image and return the
   * fields defined in keepFields. If there is a field that is not in the object, it will be ignored.
   * @param {Object} obj - The object to be checked
   * @param {Array} keepFields - The fields to be kept in the image object
   * @param {Boolean} imageFormats - If true, the field 'formats' will be kept in the object
   * @returns {Object} - The object with the image fields removed
   */
  if (obj?.height && obj?.width && obj?.url) {
    const newObject = {};

    keepFields.forEach(field => {
      if (obj[field]) newObject[field] = obj[field];
    });

    if (imageFormats && obj?.formats) {
      newObject.urlThumb = obj.formats?.thumbnail?.url;
      newObject.urlM = obj.formats?.medium?.url;
      newObject.urlS = obj.formats?.small?.url;
      newObject.urlL = obj.formats?.large?.url;
    }

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

const cleanEmpty = (arrFields) => {
  /**
   * Remove the empty objects from the array.
   * @param {Array} arrFields - The array to be cleaned
   * @returns {Array} - The cleaned array
   */
  return arrFields.filter(field => {
    for (const key in field) {
      if (Array.isArray(field[key]) && field[key].length > 0) return true;
      if (typeof field[key] === 'object' && Object.keys(field[key]).length > 0) return true;
    }
    return false;
  })
}

const getSpecificFields = (obj, fields) => {
  /**
   * Get the specific fields from the object and return the object with only the specific fields.
   * @param {Object} obj - The object to be checked
   * @param {Array} fields - The specific fields to be populated
   * @returns {Object} - The object with the specific fields
   */
  const newObj = {};
  fields.forEach(field => {
    if (obj[field]) newObj[field] = obj[field];
  });

  if (Object.keys(newObj).length > 0) speFields.push(newObj);
}

const objectCustomizer = (
  obj,
  fieldsToRemove,
  pickedFieldsInImage,
  removeNestedFieldsWithSameName,
  collectionNSingleTypes,
  specificFields,
  imageFormats
) => {
  /**
   * If the object has nested objects, we need to iterate over them using recursion to remove the fields
   * with removeGenericFields, removeSameNameInNestedFields and removeImageFields functions and return
   * the object cleaned.
   * @param {Object} obj - The object to be cleaned
   * @param {Array} fieldsToRemove - The fields to be removed from the object
   * @param {Array} pickedFieldsInImage - The fields to be kept in the image object
   * @param {Boolean} removeNestedFieldsWithSameName - If true, the child will be replaced by the child's child
   * @param {Array} collectionNSingleTypes - The list of Collection and Single Types to check to remove
   * @param {Array} specificFields - The specific fields to be populated
   * @param {Boolean} imageFormats - If true, the field 'formats' will be kept in the object
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
          collectionNSingleTypes,
          specificFields,
          imageFormats
        );

    if (fieldsToRemove.length > 0) obj = removeGenericFields(obj, fieldsToRemove);
    if (removeNestedFieldsWithSameName) obj = removeSameNameInNestedFields(obj, collectionNSingleTypes);
    if (collectionNSingleTypes.length > 0 && removeNestedFieldsWithSameName) obj = removeCollectionNamesInNested(obj, collectionNSingleTypes);
    if (pickedFieldsInImage.length > 0) obj = removeImageFields(obj, pickedFieldsInImage, imageFormats);

    if (specificFields.length > 0) getSpecificFields(obj, specificFields);
  }

  return obj;
}

const makeQueries = async (strapi, event, model, apiRefUid) => {
  /**
   * Make the queries to the database, redefine the 'where' clause if necessary and return the response.
   * @param {Object} strapi - The strapi object
   * @param {Object} event - The event from the lifecycle hook
   * @param {Object} model - The model to be populated
   */
  let setWhere = event.params?.where; // {} -> locale, etc...
  const publishFalse = {publishedAt: { '$null': false }};

  if (!setWhere) setWhere = { $and: [publishFalse] };
  else if (setWhere?.$and) setWhere = { $and: [...setWhere?.$and, publishFalse] };

  event.params.populate = model;
  event.params.where = setWhere;

  const whereIdentifiers = ['$eq', '$in', '$gt', '$gte', '$lte', '$lt', '$ne', '$nin', '$contains', '$containsi', '$ncontains'];
  const whereSave = JSON.stringify(event.params.where);
  const whereHasEqOrIn = whereIdentifiers.some(identifier => JSON.stringify(whereSave).includes(identifier));

  let queryResponse = await strapi.db.query(apiRefUid).findMany(event.params);
  // IMPORTANT!
  // When the query doesn't match with the 'where' clause in db,
  // we need to query without it as if it was a default query.
  if (queryResponse.length < 1 && !whereHasEqOrIn) {
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
  if (event?.params?.limit) {
    const [data, counter] = await strapi.db.query(apiRefUid).findWithCount({limit: 1});

    return {
      pagination:{
        pageSize: event?.params?.limit,
        page: event?.params?.offset + 1,
        total: counter,
        pageCount: Math.ceil(counter / event?.params?.limit)
      }
    };
  }

  return {};
}

const customResponseGenerator = async (
  strapi,
  event,
  model,
  apiRefUid,
  unnecessaryFields,
  pickedFieldsInImage,
  removeNestedFieldsWithSameName,
  depth,
  specificFields,
  imageFormats
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
   * @param {Number} depth - The depth level to populate
   * @param {Array} specificFields - The specific fields to be populated
   * @param {Boolean} imageFormats - If true, the field 'formats' will be kept in the object
   * @returns {Object} - The custom response
   */
  const ctx = strapi.requestContext.get();
  const collectionNSingleTypes = files.slice(1, files.length).map(file => file);

  const queryResponseCleaned = await makeQueries(strapi, event, model, apiRefUid);
  const meta = await getMeta(event, apiRefUid);
  let specificResponse = {};

  const cleanedResponse = objectCustomizer(
    queryResponseCleaned,
    unnecessaryFields,
    pickedFieldsInImage,
    removeNestedFieldsWithSameName,
    collectionNSingleTypes,
    [],
    imageFormats
  );

  if (specificFields.length > 0) {
    const newModel = getFullPopulateObject(apiRefUid, depth, unnecessaryFields, []);
    const strapiResponse = await strapi.db.query(apiRefUid).findMany({populate: newModel.populate, where: { $and: [{publishedAt: { '$null': false }}] }});

    objectCustomizer(
      strapiResponse,
      unnecessaryFields,
      pickedFieldsInImage,
      removeNestedFieldsWithSameName,
      collectionNSingleTypes,
      specificFields,
      imageFormats
    );

    specificResponse = cleanEmpty(JSON.parse(JSON.stringify(speFields)));
    speFields = [];
  }

  ctx.send({
    customData: (cleanedResponse || []),
    meta: meta,
    specific: specificResponse
  });
};

module.exports = {
  customResponseGenerator
};
