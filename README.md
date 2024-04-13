# Strapi plugin custom-deep-populate

This Strapi plugin streamlines the process of populating complex content structures through the REST API. It enables you to specify a custom depth for data retrieval, eliminate unwanted fields, and filter out nested fields with identical names. Best of all, each of these features is fully customizable to suit your specific needs.

---

# Installation

```sh
npm i custom-deep-populate
```
Or
```sh
yarn add custom-deep-populate
```
Or
```sh
pnpm i custom-deep-populate
```

---

# Usages

## Examples

Populate a request with the default max depth.

```
/api/articles?populate=custom
```

Populate a request with the a custom depth

```
/api/articles?populate=custom,<int>
```

For example, to populate a request with a custom depth of 5:

```
/api/articles?populate=custom,5
```

Or

```
/api/articles/1?populate=custom,5
```

## Good to know

The default max depth is 10 levels deep.

The populate deep option is available for all collections and single types using the findOne and findMany methods.

---

# Configuration

The default values can be customized via the plugin config. To do it, create or edit your `plugins.js/plugins.ts` file.

## Example configuration

`config/plugins.js`

```js
module.exports = ({ env }) => ({
  'custom-deep-populate': {
    config: {
      unnecessaryFields: [], // OPTIONAL -> Default: ["createdAt", "updatedAt", "publishedAt", "createdBy", "updatedBy"]
      removeExtraImageFields: true, // OPTIONAL -> Default: true
      removeNestedFieldsWithSameName: true, // OPTIONAL -> Default: true
      defaultDepth: 10, // OPTIONAL -> Default: 10
    }
  },
});
```

Or

`config/plugins.ts`

```ts
export default {
  'custom-deep-populate': {
    config: {
      unnecessaryFields: [], // OPTIONAL -> Default: ["createdAt", "updatedAt", "publishedAt", "createdBy", "updatedBy"]
      removeExtraImageFields: true, // OPTIONAL -> Default: true
      removeNestedFieldsWithSameName: true, // OPTIONAL -> Default: true
      defaultDepth: 10, // OPTIONAL -> Default: 10
    }
  },
};
```

## Configuration options extended
1. `unnecessaryFields` - An **array** of fields that should be removed from the response. When the array is empty, the response will contain all fields.
2. `removeExtraImageFields` - A **boolean** that determines whether extra image fields should be removed from the response. When set to true, the response will contain only the url and alternativeText (as alt) fields.
3. `removeNestedFieldsWithSameName` - A **boolean** that determines whether nested fields with the same name should be removed from the response. When set to true, the response will contain only the first field with the same name. F.E. if there is a field nestes as `{icon: {icon: "iconName"}}` where `icon` is the same name, the response will contain only the first `icon` field as `{icon: "iconName"}`. _NOTE: Used usually when has collections with the same name as the nested field._
4. `defaultDepth` - An **integer** that determines the default depth for the populate deep option. When set to 10, the response will contain data up to 10 levels deep.

---

# Contributions
The original idea for getting the populated structure was created by [tomnovotny7](https://github.com/tomnovotny7) and can be found in [this](https://github.com/strapi/strapi/issues/11836) github thread,
then was created a plugin by [Barelydead (Christofer Jungberg)](https://github.com/Barelydead) and can be found [here](https://github.com/Barelydead/strapi-plugin-populate-deep). From this plugin, the current plugin was created.
