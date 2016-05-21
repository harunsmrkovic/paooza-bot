'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var intents = {
  list: ['gladni', 'smo'],
  food: ['gotovo', 'glasanje'],
  summary: ['haj', 'naplati']
};

var recognizeIntent = function recognizeIntent(message) {
  var messageWords = message.toLowerCase().split(' ');
  var foundIntent = false;
  (0, _underscore2.default)(intents).each(function (words, intent) {
    if (_underscore2.default.intersection(words, messageWords).length === words.length) {
      foundIntent = intent;
    }
  });
  return foundIntent;
};

exports.default = recognizeIntent;