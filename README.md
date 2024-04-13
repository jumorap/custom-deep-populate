# Strapi plugin custom-deep-populate

This Strapi plugin streamlines the process of populating complex content structures through the REST API. It enables you to specify a custom depth for data retrieval, eliminate unwanted fields, and filter out nested fields with identical names. Best of all, each of these features is fully customizable to suit your specific needs.

# Installation

`npm install custom-deep-populate`

`yarn add custom-deep-populate`

`pnpm i custom-deep-populate`


# Usages

## Examples

Populate a request with the default max depth.

`/api/articles?populate=deep`

Populate a request with the a custom depth

`/api/articles?populate=deep,10`

Populate a request with the a custom depth

`/api/articles/1?populate=deep,10`

## Good to know

The default max depth is 10 levels deep.

The populate deep option is available for all collections and single types using the findOne and findMany methods.

# Configuration

The default depth can be customized via the plugin config. To do so create or edit you plugins.js/plugins.ts file.

## Example configuration

`config/plugins.js`

```
module.exports = ({ env }) => ({
  'custom-deep-populate': {
    config: {
      unnecessaryFields: [], // Default: ["createdAt", "updatedAt", "publishedAt", "createdBy", "updatedBy"]
      removeExtraImageFields: true, // Default: true
      removeNestedFieldsWithSameName: true, // Default: true
      defaultDepth: 10, // Default: 10
    }
  },
});
```

Or

`config/plugins.ts`

```
export default {
  'custom-deep-populate': {
    config: {
      unnecessaryFields: [], // Default: ["createdAt", "updatedAt", "publishedAt", "createdBy", "updatedBy"]
      removeExtraImageFields: true, // Default: true
      removeNestedFieldsWithSameName: true, // Default: true
      defaultDepth: 10, // Default: 10
    }
  },
});
```

# Contributions
The original idea for getting the populated structure was created by [tomnovotny7](https://github.com/tomnovotny7) and can be found in [this](https://github.com/strapi/strapi/issues/11836) github thread,
then was created a plugin by [Barelydead (Christofer Jungberg)](https://github.com/Barelydead) and can be found [here](https://github.com/Barelydead/strapi-plugin-populate-deep). From this plugin, the current plugin was created.
