# Strapi plugin custom-deep-populate

This Strapi plugin streamlines the process of populating complex content structures through the REST API. It enables you to specify a custom depth for data retrieval, eliminate unwanted fields, and filter out nested fields with identical names. Best of all, each of these features is fully customizable to suit your specific needs.

---

## Performance Improvements

With recent optimizations, this plugin delivers even faster performance than similar plugins such as `strapi-plugin-populate-deep`.

- **Request Time Reduction**: The time taken for a request has been reduced from 210ms to 180ms (average) when using the same content manager, resulting in a **14.29% decrease** in request time.
- **Data Size Reduction**: The size of the returned information has been minimized from 8KB to 3KB (average), indicating a **62.5% reduction** in data size.
- **File Complexity Reduction**: The complexity of reading files has been significantly reduced, with the average number of lines decreasing from 500 to 200, resulting in a **60% reduction** in file complexity.

| Improvement Type         | strapi-plugin-populate-deep | custom-deep-populate | Percentage Improvement (average) |
|--------------------------|-----------------------------|----------------------|----------------------------------|
| Request Time Reduction   | <span style="color:red">210ms</span> | <span style="color:green">180ms</span> | <span style="color:green">14.29%</span> |
| Data Size Reduction      | <span style="color:red">8KB</span> | <span style="color:green">3KB</span> | <span style="color:green">62.5%</span> |
| File Complexity Reduction| <span style="color:red">500 lines</span> | <span style="color:green">200 lines</span> | <span style="color:green">60%</span> |

These results were obtained by comparing the performance of the `strapi-plugin-populate-deep` plugin with the `custom-deep-populate` plugin with the next configurations:

```js
module.exports = ({ env }) => ({
  'custom-deep-populate': {
    config: {
      unnecessaryFields: ["createdAt", "updatedAt", "publishedAt", "createdBy", "updatedBy", "id"],
      fieldsToKeepInImage: ["url", "alternativeText"],
      removeNestedFieldsWithSameName: true,
      defaultDepth: 10,
    }
  },
});
```

These enhancements ensure that your Strapi experience is not only more efficient but also more responsive, enhancing overall user satisfaction.

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

Populate a request with a custom depth

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

Populate a request with a custom depth and remove fields from unnecessary fields
(in `config.js`/`config.ts`) using the `remove` keyword.

```
/api/articles?populate=custom,<int>,<string>,<string>,...,<string>
```

For example, to populate a request with a custom depth of 5 and remove the unnecessary fields `createdAt` and `updatedAt`:

```
/api/articles?populate=custom,5,createdAt,updatedAt
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
      fieldsToKeepInImage: [], // OPTIONAL -> Default: ["url", "alternativeText"]
      removeNestedFieldsWithSameName: true, // OPTIONAL -> Default: true
      imageFormats: false, // OPTIONAL -> Default: false (requires fieldsToKeepInImage to be set with the value "url" in the array in config.js/config.ts)
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
      fieldsToKeepInImage: [], // OPTIONAL -> Default: ["url", "alternativeText"]
      removeNestedFieldsWithSameName: true, // OPTIONAL -> Default: true
      imageFormats: false, // OPTIONAL -> Default: false (requires fieldsToKeepInImage to be set with the value "url" in the array in config.js/config.ts)
      defaultDepth: 10, // OPTIONAL -> Default: 10
    }
  },
};
```

## Configuration options extended
1. `unnecessaryFields` - An **array** of fields that should be removed from the response. When the array is empty, the response will contain all fields.
2. `fieldsToKeepInImage` - An **array** of fields that should be kept in the image response. When the array is empty, the response will contain only the url and alternativeText fields.
3. `removeNestedFieldsWithSameName` - A **boolean** that determines whether nested fields with the same name should be removed from the response. When set to true, the response will contain only the first field with the same name. F.E. if there is a field nestes as `{icon: {icon: "iconName"}}` where `icon` is the same name, the response will contain only the first `icon` field as `{icon: "iconName"}`. _NOTE: Used usually when has collections with the same name as the nested field._
4. `imageFormats` - A **boolean** that allow to get the image formats in the image response. When set to true, the response will contain the formats of the image. F.E. Will contain the urls of the image in the different available formats in the current image (thumbnail, small, medium, large, etc). _NOTE: Requires fieldsToKeepInImage to be set with the value "url" in the array in config.js/config.ts._
   - **NOTE**: To get the image formats in the image response in a specific endpoint, can use `imageFormats` directly in the query string as:
   ```
   api/articles?populate=custom,10,...,imageFormats,...
   ``` 
5. `defaultDepth` - An **integer** that determines the default depth for the populate deep option. When set to 10, the response will contain data up to 10 levels deep.

---

# Contributions
The original idea for getting the populated structure was created by [tomnovotny7](https://github.com/tomnovotny7) and can be found in [this](https://github.com/strapi/strapi/issues/11836) github thread, then was created a plugin by [Barelydead (Christofer Jungberg)](https://github.com/Barelydead) and can be found [here](https://github.com/Barelydead/strapi-plugin-populate-deep). From this plugin, the current plugin was created.
