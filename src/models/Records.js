const mongoose=require('mongoose');

const RecordSchema=new mongoose.Schema({
    record_name:{type:String, required:true, trim:true},
    record_description:{type:String, required:true, trim:true},
    record_field1: { type: String, required: true, trim: true },
    record_field2: { type: String, required: false, trim: true },
    record_field3: { type: String, required: false, trim: true },
    record_user:{type: mongoose.Schema.Types.ObjectId, required: false}

});
const Record = mongoose.model('Record', RecordSchema);
module.exports = Record;