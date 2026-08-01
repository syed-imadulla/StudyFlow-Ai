const mongoose = require('mongoose');
const { Goal } = require('./backend/src/models/Goal.js');

mongoose.connect('mongodb://localhost:27017/studyflow', { useNewUrlParser: true })
  .then(async () => {
    const goal = await Goal.findOne().sort('-createdAt');
    if (goal) {
      console.log(JSON.stringify(goal.subtasks, null, 2));
    } else {
      console.log('No goals found');
    }
    process.exit(0);
  });
