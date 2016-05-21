'use strict';

var _nodeTrello = require('node-trello');

var _nodeTrello2 = _interopRequireDefault(_nodeTrello);

var _slackbots = require('slackbots');

var _slackbots2 = _interopRequireDefault(_slackbots);

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _q = require('q');

var _q2 = _interopRequireDefault(_q);

var _intents = require('./intents.js');

var _intents2 = _interopRequireDefault(_intents);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var bot = new _slackbots2.default({ token: 'xoxb-44769858246-JUIYWhyRHNgurmwRu20hvTqc', name: 'Pasha Konobar' });
var trello = new _nodeTrello2.default('09141f27e3d86dff19f42ccec277ab54', '8cd0841ae9411d071baccbbdc5d351ba154cda40fa04c1c2bdef7b00be591d30');

var sendMessage = function sendMessage(channel, message) {
  return bot.postMessage(channel, message, { as_user: true });
};

var sendRestaurant = function sendRestaurant(channel, restaurant) {
  return new Promise(function (resolve, reject) {
    var id = restaurant.id;
    var name = restaurant.name;

    sendMessage(channel, name).then(function (res) {
      resolve({
        id: id,
        name: name,
        ts: res.ts,
        votes: 0,
        people: [],
        meals: []
      });
    });
  });
};

var sendMeal = function sendMeal(channel, meal, restaurant) {
  return new Promise(function (resolve, reject) {
    var name = meal.name;

    sendMessage(channel, name).then(function (res) {
      resolve({
        name: name,
        ts: res.ts,
        orders: 0,
        restaurant: restaurant
      });
    });
  });
};

bot.on('start', function () {
  console.log('Bot initiated...');
});

var openChannels = {};

bot.on('message', function (message) {
  var channel = message.channel;

  if (message.type === 'message') {

    switch ((0, _intents2.default)(message.text)) {
      // Gladni smo
      case 'list':
        trello.get('/1/boards/1uZ6QBWt/lists', function (err, restaurants) {
          if (err) {
            console.warn(err);
            sendMessage(channel, 'Trello connection failed' + JSON.stringify(err, null, 2));
          } else {
            var sendRestaurants = restaurants.map(function (restaurant) {
              return sendRestaurant(channel, restaurant);
            });

            _q2.default.all(sendRestaurants).then(function (sentRestaurants) {
              openChannels[channel] = {
                restaurants: sentRestaurants,
                context: 'choosing-restaurant'
              };
            });
          }
        });
        break;
      case 'food':
        openChannels[channel].context = 'choosing-food';
        openChannels[channel].selectedRestaurant = _underscore2.default.max(openChannels[channel].restaurants, 'votes');
        sendMessage(channel, '*Demokratskim putem je odabran restoran _' + openChannels[channel].selectedRestaurant.name + '_*');

        trello.get('/1/lists/' + openChannels[channel].selectedRestaurant.id, { cards: 'open' }, function (err, restaurant) {
          var sendMeals = restaurant.cards.map(function (meal) {
            return sendMeal(channel, meal, openChannels[channel].selectedRestaurant.id);
          });

          _q2.default.all(sendMeals).then(function (sentMeals) {
            openChannels[channel].selectedRestaurant.meals = sentMeals;
          });
        });
      case 'summary':
        var summary = openChannels[channel].selectedRestaurant.meals.filter(function (a) {
          return a.orders > 0;
        }).sort(function (a, b) {
          return b.orders - a.orders;
        }).map(function (meal) {
          return [meal.name, meal.orders].join(' x');
        }).join('\n');
        sendMessage(channel, summary);
        break;
      default:
        // sendMessage(channel, 'Pricaj bre srpski da te ceo svet razume')
        break;
    }
  } else if (message.type == 'reaction_added') {
    (function () {
      var item = message.item;

      var currentChannel = openChannels[item.channel];
      switch (currentChannel.context) {
        case 'choosing-restaurant':
          currentChannel.restaurants = currentChannel.restaurants.map(function (restaurant) {
            if (item.ts === restaurant.ts && !restaurant.people.includes(message.user)) {
              restaurant.votes += 1;
              restaurant.people.push(message.user);
            }
            return restaurant;
          });
          break;
        case 'choosing-food':
          currentChannel.selectedRestaurant.meals = currentChannel.selectedRestaurant.meals.map(function (meal) {
            if (item.ts === meal.ts) {
              meal.orders += 1;
            }
            return meal;
          });
          break;
      }

      console.log(JSON.stringify(currentChannel, null, 2));
    })();
  }
});