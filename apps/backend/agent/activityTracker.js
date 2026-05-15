const fs = require("fs")
const path = require("path")

const FILE = path.join(__dirname, "../data/activity.json")

function load(){
  try{
    return JSON.parse(fs.readFileSync(FILE))
  }catch{
    return { date: today(), count: 0 }
  }
}

function save(data){
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2))
}

function today(){
  return new Date().toISOString().slice(0,10)
}

function canPost(limit = 10){

  const data = load()

  if(data.date !== today()){
    data.date = today()
    data.count = 0
  }

  if(data.count >= limit){
    return false
  }

  data.count += 1
  save(data)

  return true
}

module.exports = { canPost }