'use strict';

const { getFullPopulateObject, setFalseNoMedia } = require('./helpers');
const { customResponseGenerator } = require('./custom-response');

// REWRITTEN OVER "strapi-plugin-populate-deep": "^3.0.1",
module.exports = async ({ strapi }) => {
  // Subscribe to the lifecycles that we are interested in.
  await strapi.db.lifecycles.subscribe(async (event) => {
    if (event.action === 'beforeFindMany' || event.action === 'beforeFindOne') {
      const populate = event.params?.populate;

      const fieldsToRemove = ["createdAt", "updatedAt", "publishedAt", "createdBy", "updatedBy"];
      const fieldsInImage = ["url", "alternativeText"];

      let unnecessaryFields = strapi.plugin('custom-deep-populate')?.config('unnecessaryFields') || fieldsToRemove;
      let imageFormats = strapi.plugin('custom-deep-populate')?.config('imageFormats') || false;
      let imageInline = strapi.plugin('custom-deep-populate')?.config('imageInline') || false;
      const fieldsToKeepInImage = strapi.plugin('custom-deep-populate')?.config('fieldsToKeepInImage') || fieldsInImage;
      const removeNestedFieldsWithSameName = strapi.plugin('custom-deep-populate')?.config('removeNestedFieldsWithSameName') || true;
      const defaultDepth = strapi.plugin('custom-deep-populate')?.config('defaultDepth') || 10;

      if (populate && populate[0] === 'custom') {
        let depth = populate[1] ?? defaultDepth;
        const newUnnecessaryFields = populate.slice(2, populate.length).filter(item => !item.startsWith('.')) ?? [];
        const specificFields = populate.slice(2, populate.length).filter(item => item.startsWith('.')).map(item => item.substring(1)) ?? [];

        unnecessaryFields = unnecessaryFields.filter(field => !newUnnecessaryFields.includes(field));

        if (newUnnecessaryFields.includes('imageFormats')) imageFormats = !imageFormats;
        if (newUnnecessaryFields.includes('imageInline')) imageInline = true;

        if (imageInline) depth = Number(depth) + 1;
        const modelObject = setFalseNoMedia(getFullPopulateObject(event.model.uid, depth, unnecessaryFields, []), imageInline);

        // event.params.populate = modelObject.populate // This line was removed kuz generated a response with the full data. It consumes a lot of memory processing data and it's not necessary.
        await customResponseGenerator(
          strapi,
          event,
          modelObject.populate,
          event.model.uid,
          unnecessaryFields,
          fieldsToKeepInImage,
          removeNestedFieldsWithSameName,
          depth,
          specificFields,
          imageFormats,
          imageInline
        );
      }
    }
  });
};
