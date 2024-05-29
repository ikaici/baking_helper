const mongoose = require('mongoose');

const recipeSchema = new mongoose.Schema({
    title: String,
    description: String,
    ingredients: [String],
    instructions: String,
    image: String,
    slug: { type: String, unique: true }
});


module.exports = mongoose.model('Recipes', recipeSchema, 'recipes');