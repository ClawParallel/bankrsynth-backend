let users = {}

function updateUser(user,message){

if(!users[user]){
users[user] = {
messages:[],
lastSeen:Date.now()
}
}

users[user].messages.push(message)
users[user].lastSeen = Date.now()

if(users[user].messages.length > 10){
users[user].messages.shift()
}

}

function getUserContext(user){
return users[user] || null
}

module.exports = { updateUser, getUserContext }