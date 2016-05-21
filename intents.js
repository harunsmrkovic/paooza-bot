import _ from 'underscore'
const intents = {
  list: ['gladni', 'smo'],
  food: ['gotovo', 'glasanje'],
  summary: ['haj', 'naplati']
}

const recognizeIntent = message => {
  const messageWords = message.toLowerCase().split(' ')
  let foundIntent = false
  _(intents).each((words, intent) => {
    if(_.intersection(words, messageWords).length === words.length){
      foundIntent = intent
    }
  })
  return foundIntent
}

export default recognizeIntent
