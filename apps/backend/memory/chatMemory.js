let memory = []

function saveMessage(user,message){

memory.push({
user,
message,
time:Date.now()
})

if(memory.length > 20){
memory.shift()
}

}

function getMemory(){
return memory
}

module.exports = { saveMessage, getMemory }