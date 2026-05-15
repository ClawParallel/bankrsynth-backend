const { exec } = require("child_process")

function run(cmd){
  return new Promise((resolve, reject)=>{
    exec(cmd, (err, stdout)=>{
      if(err) return reject(err)
      resolve(stdout)
    })
  })
}

async function readFeed(feed = "general"){

  try{

    const output = await run(`npx netp feed read ${feed} --limit 5 --json`)

    const parsed = JSON.parse(output)

    return parsed.map(msg => ({
      id: msg.id,
      text: msg.text,
      feed: feed,
      author: msg.author
    }))

  }catch(err){

    console.log("Botchan read error:", err.message)
    return []

  }

}

module.exports = readFeed