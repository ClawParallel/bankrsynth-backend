const { exec } = require("child_process")

function run(cmd){
  return new Promise((resolve, reject)=>{
    exec(cmd, (err, stdout)=>{
      if(err) return reject(err)
      resolve(stdout)
    })
  })
}

async function postMessage({ message, feed = "general", replyTo = null }){

  try{

    // reply ke post
    if(replyTo){
      console.log("Replying to:", replyTo)

      await run(`npx netp feed comment ${replyTo} "${message}"`)
      return
    }

    // post biasa
    console.log("Posting to feed:", feed)

    await run(`npx netp feed post ${feed} "${message}"`)

  }catch(err){

    console.log("Botchan post error:", err.message)

  }

}

module.exports = postMessage