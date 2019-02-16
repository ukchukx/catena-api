module.exports = {
  env: {
    node: true
  },
  parserOptions: {
    ecmaVersion: 2017
  },
  extends: 'airbnb-base',
  rules: {
    'class-methods-use-this': 'off',
    'no-underscore-dangle': 'off',
    'import/no-extraneous-dependencies': 'off',
    'object-shorthand': 'off',
    'object-curly-newline': 'off',
    'camelcase': 'off',
    'yoda': 'off',
    'comma-dangle': ['error', 'never'],
    'max-len': ['error', 120, 2, { 'ignoreComments': true }],
    'no-unused-vars': ['warn', { 'vars': 'local', 'args': 'none' }],
    'no-cond-assign': ['error', 'except-parens'],
    'no-param-reassign': 'off',
    'no-nested-ternary': 'off',
    'no-trailing-spaces': 'off',
    'import/prefer-default-export': 'off',
    'linebreak-style': 'off',
    'no-continue': 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0
  },
  globals: {
    use: true
  }
};
