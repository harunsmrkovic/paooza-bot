import Trello from 'node-trello'
import SlackBot from 'slackbots'
import _ from 'underscore'
import Q from 'q'

import recognizeIntent from './intents.js'

const bot = new SlackBot({ token: 'xoxb-44769858246-JUIYWhyRHNgurmwRu20hvTqc', name: 'Pasha Konobar' })
const trello = new Trello('09141f27e3d86dff19f42ccec277ab54', '8cd0841ae9411d071baccbbdc5d351ba154cda40fa04c1c2bdef7b00be591d30')

const sendMessage = (channel, message) => {
  return bot.postMessage(channel, message, { as_user: true })
}

const sendRestaurant = (channel, restaurant) => {
  return new Promise((resolve, reject) => {
    const { id, name } = restaurant
    sendMessage(channel, name).then(res => {
      resolve({
        id,
        name,
        ts: res.ts,
        votes: 0,
        people: [],
        meals: []
      })
    })
  })
}

const sendMeal = (channel, meal, restaurant) => {
  return new Promise((resolve, reject) => {
    const { name } = meal
    sendMessage(channel, name).then(res => {
      resolve({
        name,
        ts: res.ts,
        orders: 0,
        restaurant
      })
    })
  })
}

bot.on('start', () => {
  console.log('Bot initiated...')
})

let openChannels = {}

bot.on('message', message => {
  const { channel } = message
  if (message.type === 'message') {

    switch(recognizeIntent(message.text)) {
      // Gladni smo
      case 'list':
        trello.get('/1/boards/1uZ6QBWt/lists', (err, restaurants) => {
          if (err) {
            console.warn(err);
            sendMessage(channel, 'Trello connection failed' + JSON.stringify(err, null, 2))
          } else {
            const sendRestaurants = restaurants.map(restaurant => {
              return sendRestaurant(channel, restaurant)
            })

            Q.all(sendRestaurants).then(sentRestaurants => {
              openChannels[channel] = {
                restaurants: sentRestaurants,
                context: 'choosing-restaurant'
              }
            })
          }
        })
        break;
      case 'food':
        openChannels[channel].context = 'choosing-food'
        openChannels[channel].selectedRestaurant = _.max(openChannels[channel].restaurants, 'votes')
        sendMessage(channel, `*Demokratskim putem je odabran restoran _${openChannels[channel].selectedRestaurant.name}_*`)

        trello.get('/1/lists/' + openChannels[channel].selectedRestaurant.id, { cards: 'open' }, (err, restaurant) => {
          const sendMeals = restaurant.cards.map(meal => {
            return sendMeal(channel, meal, openChannels[channel].selectedRestaurant.id)
          })

          Q.all(sendMeals).then(sentMeals => {
            openChannels[channel].selectedRestaurant.meals = sentMeals
          })
        })
      case 'summary':
        const summary = openChannels[channel].selectedRestaurant.meals
          .filter(a => a.orders > 0)
          .sort((a, b) => b.orders - a.orders)
          .map(meal => [meal.name, meal.orders].join(' x'))
          .join('\n')
        sendMessage(channel, summary)
        break;
      default:
        // sendMessage(channel, 'Pricaj bre srpski da te ceo svet razume')
        break;
    }
  } else if (message.type == 'reaction_added') {

    const { item } = message
    const currentChannel = openChannels[item.channel]
    switch (currentChannel.context) {
      case 'choosing-restaurant':
        currentChannel.restaurants = currentChannel.restaurants.map(restaurant => {
          if(item.ts === restaurant.ts && !restaurant.people.includes(message.user)){
            restaurant.votes += 1
            restaurant.people.push(message.user)
          }
          return restaurant
        })
        break;
      case 'choosing-food':
        currentChannel.selectedRestaurant.meals = currentChannel.selectedRestaurant.meals.map(meal => {
          if(item.ts === meal.ts){ meal.orders += 1 }
          return meal
        })
        break;
    }
  }
})
