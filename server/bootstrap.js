'use strict';
const { getFullPopulateObject } = require('./helpers')
const { customResponseGenerator } = require('./custom-response');

// REWRITE OVER "strapi-plugin-populate-deep": "^3.0.1",
module.exports = async ({ strapi }) => {
  // Subscribe to the lifecycles that we are intrested in.
  await strapi.db.lifecycles.subscribe(async (event) => {
    if (event.action === 'beforeFindMany' || event.action === 'beforeFindOne') {
      const populate = event.params?.populate;
      const defaultDepth = strapi.plugin('custom-deep-populate')?.config('defaultDepth') || 10

      if (populate && populate[0] === 'deep') {
        const depth = populate[1] ?? defaultDepth
        const modelObject = getFullPopulateObject(event.model.uid, depth, []);

        // event.params.populate = modelObject.populate // This line was removed kuz generated a response with the full data. It consumes a lot of memory processing data and it's not necessary.
        await customResponseGenerator(strapi, modelObject.populate)
      }
    }
  });
};
