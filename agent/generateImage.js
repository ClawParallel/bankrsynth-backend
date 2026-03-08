async function generateImage(name){

const prompt = `${name} crypto meme logo cyberpunk green`

const url =
`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`

return url

}

module.exports = generateImage