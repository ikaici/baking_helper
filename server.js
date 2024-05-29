const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const Recipe = require('./recipe');
const multer = require('multer');

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Specify the directory to save uploaded files
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname); // Generate a unique filename
    }
});
const upload = multer({ storage: storage });

const app = express();
const port = process.env.PORT || 4000;

const uri = process.env.MONGO_CONNECTION_STRING;

app.set('view engine', 'ejs');
app.use(express.static('views'));
app.use(express.static('uploads')); // Serve uploads directory statically
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB using Mongoose
mongoose.connect(uri, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true, 
  dbName: process.env.MONGO_DB_NAME,
  serverSelectionTimeoutMS: 30000 
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('Error connecting to MongoDB', err);
  process.exit(1);
});

function createSlug(title) {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')  // Remove special characters
        .replace(/\s+/g, '-')         // Replace spaces with hyphens
        .replace(/-+/g, '-');         // Remove multiple consecutive hyphens
}


// Route to get a specific recipe by slug
app.get('/recipe/:slug', async (req, res) => {
    try {
        const recipe = await Recipe.findOne({ slug: req.params.slug });
        if (recipe) {
            res.render('recipe', { recipe });
        } else {
            res.status(404).send('Recipe not found');
        }
    } catch (error) {
        res.status(500).send('Error retrieving recipe');
    }
});

async function addRecipe(title, description, ingredients, instructions, image) {
    try {
        // Upload the image and get the file path
        const imagePath = await uploadImage(image); // Function to handle image upload (defined below)

        // Create a new recipe document with the uploaded image path
        const newRecipe = new Recipe({
            title,
            description,
            ingredients,
            instructions,
            image: imagePath, // Store the image path in the recipe document
            slug: createSlug(title) 
        });

        // Save the new recipe document to the database
        await newRecipe.save();
        console.log('Recipe added successfully');
    } catch (error) {
        console.error('Error adding recipe:', error);
    }
}

// Function to handle image upload using Multer
function uploadImage(image) {
    return new Promise((resolve, reject) => {
        upload.single('image')(null, null, async function (err) {
            if (err) {
                reject(err);
            } else {
                if (!req.file) {
                    reject(new Error('No file uploaded'));
                } else {
                    resolve(req.file.path); // Resolve with the file path
                }
            }
        });
    });
}

// Route to list all recipes and select a random featured recipe
app.get('/', async (req, res) => {
    try {
        const recipes = await Recipe.find();
        let featuredRecipe = null;

        if (recipes.length > 0) {
            const featuredRecipeArray = await Recipe.aggregate([{ $sample: { size: 1 } }]);
            if (featuredRecipeArray.length > 0) {
                featuredRecipe = featuredRecipeArray[0];
            }
        }

        res.render('main', { recipes: recipes, featuredRecipe: featuredRecipe});


    } catch (error) {
        console.error('Error fetching recipes:', error);
        res.status(500).send('Error fetching recipes');
    }
});



// Express route to add a recipe
app.post('/add-recipe', upload.single('image'), async (req, res) => {
    try {
        const { title, description, ingredients, instructions } = req.body;
        const image = req.file.filename; // Multer adds 'filename' property to 'req.file' containing the uploaded file name
        const slug = createSlug(title);

        const newRecipe = new Recipe({
            title,
            description,
            ingredients: ingredients.split(','), // Assuming ingredients are sent as a comma-separated string
            instructions,
            image,
            slug
        });

        await newRecipe.save();
        res.redirect('/');
    } catch (error) {
        console.error('Error adding recipe:', error);
        res.status(500).send('Error adding recipe');
    }
});


process.stdin.setEncoding('utf8');
process.stdin.on('data', (data) => {
    const input = data.trim().toLowerCase();
    if (input === 'stop') {
        mongoose.connection.close().then(() => {
            console.log('Shutting down the server!!!');
            process.exit();
        });
    }
});

app.listen(port, () => {
    console.log(`Server started and running at http://localhost:${port}`);
});
