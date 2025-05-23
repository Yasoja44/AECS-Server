const UserSchema = require('../models/Users');
const bcrypt =require('bcryptjs');
const jwt =require('jsonwebtoken');
const EmailSend =require('./SendEmail')
const nodemailer = require("nodemailer");
const {CLIENT_URL} = process.env

//Adding users
const addUsers= async (req, res) => {
    try {
        const {firstName, lastName, email, mobileNo, address,DOB,Gender,password} = req.body

        console.log(req.body)

        //User validations
        if (!firstName || !lastName || !email || !mobileNo || !address || !DOB || !Gender|| !password)
            return res.status(400).json({alert: "Please enter fill in fields"})

        if (!validateEmail(email)) {
            return res.status(400).json({alert: "Please enter Correct Email"})
        }

        if (password.length < 3) {
            return res.status(400).json({alert: "Password has to be at least 3 characters"});
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const userCheckEmail = await UserSchema.findOne({email})

        if(userCheckEmail){
            return res.status(400).json({alert: "There is a user that already uses this email"});
        }

        const newUser = new UserSchema({
            firstName,
            lastName,
            email,
            mobileNo,
            address,
            DOB,
            Gender,
            password : passwordHash
        })
        await newUser.save()

        res.json({msg: "Register SuccessFull...!"});
    } catch (err) {
        return res.status(500).json({alert: "Server Error..."});
    }
}

//Activating Email
const UserActiveEmail= async (req, res) => {
    try {
        const {auth_token} = req.body
        const user = jwt.verify(auth_token, process.env.JWT_SECRET)

        const {firstName, lastName, email, mobileNo, address,DOB,Gender,password} = user

        const userCheckEmail = await UserSchema.findOne({email})

        if(userCheckEmail){
            return res.status(400).json({alert: "There is a already uses this email"});
        }

        const newUser = new UserSchema({
            firstName,
            lastName,
            email,
            mobileNo,
            address,
            DOB,
            Gender,
            password
        })
        await newUser.save()

        res.json({msg: "Account activate"})

    } catch (err) {
        return res.status(500).json({msg: err.message})
    }
}

//Login functionality
const login = async (req, res)=>{
    try{
        const {email,password} =req.body;

        if(!email || !password){
            return  res.status(400).json({errormessage:"please enter all required fields"});
        }

        const user =await UserSchema.findOne({email});
        if(!user){
            return res.status(400).json({errormessage:"No one using this email"});
        }

        //decrypting the passowrd as to see if the entered password matches
        const passwordMatch = await bcrypt.compare(password, user.password);


        if(passwordMatch){

            const payload = {
                user: {
                    id: user.id
                }
            };
            //Creating the activation token and sending it back to client
            const token = ActivationToken(payload);
            res.json({token:token});

        } else return res.status(401).json({msg:"Password is not Matching "})
    }catch (e){
        console.log(e.message);
        return res.status(500).json({alert:"server Error"});
    }
}

//Get one user information except password
const getSpecificUser = async (req,res) =>{
    try {
        const user = await UserSchema.findById(req.user.id).select('-password')

        res.json(user)
    }catch (e) {
        console.log(e.message);
        return res.status(500).json({alert:"server Error"});
    }
}

//Get one admin
const getSpecificAdminUsers = async (req, res) => {
    try {
        if (req.params && req.params.id) {
            await UserSchema.findById(req.params.id)
                .then(response => {
                    res.status(200).send({data: response});
                })
                .catch(error => {
                    res.status(500).send({error: error.message});
                });
        }
    }catch (e){
        console.log(e.message);
        return res.status(500).json({msg:"server Error..."});
    }
}

//Add admin user
const adminAddUsers = async (req, res) => {
    try {
        let {firstName, lastName, email, mobileNo, address, DOB,Gender, user_password,position, specialization} = req.body;
        let user = await UserSchema.findOne({email});

        if (user) {
            return res.status(400).json({alert: "There is a already uses this email"});
        }
        //hashing the password
        const salt = await bcrypt.genSalt();
        const password = await bcrypt.hash(user_password, salt);

        const admin_user = new UserSchema({
            firstName,
            lastName,
            email,
            mobileNo,
            address,
            DOB,
            Gender,
            position,
            specialization,
            password
        });

        await admin_user.save();
        const payload = {
            admin_user: {
                id: admin_user.id
            }
        }

        const authToken = ActivationToken(payload);

        //Creating the mail to send to the registered users
        var transporter = nodemailer.createTransport({

            service: 'Gmail',
            auth: {
                user: 'hugoproducts119@gmail.com',
                pass: '123hugo@12'
            }
        });

        var mailOptions = {

            from: 'hugoproducts119@gmail.com',
            to: email,
            subject: 'Equinox Gym - 2021',
            html: `
            <div><img src="../image/logo.png" height="100" width="100"/></div>
            <div style="max-width: 700px; margin:auto; border: 10px solid #ddd; padding: 50px 20px; font-size: 110%;">
            <h2 style="text-align: center; text-transform: uppercase;color: teal;">Welcome to Conference 2021.</h2>
            <h1>Congratulations! Equinox 2021.
            </h1>
            <p style="background: red">Your are select the ${position}</p>           
            <p>if the button is not working, please select the link below:</p>
            <a href="${authToken}"></a>
            </div>
        `
        };

        await transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });

        res.status(200).json({auth_token: authToken})
    } catch (e) {
        console.log(e.message);
        return res.status(500).json({msg: "server Error..."});
    }
}

//Forget Password functionality
const forgotPassword = async (req, res)=>{
    try{
        const {email} = req.body;

        const user =await UserSchema.findOne({email});
        if(!user){
            return res.status(400).json({errormessage:"No one using this email"});
        }

        //Jwt token to reset password
        const access_jwt_token  = ActivationToken({id:user._id});

        //Craeting the url to reset the password
        const url =`${CLIENT_URL}/users/reset_password/${access_jwt_token}`

        //Sending the email to reset the password
        EmailSend(email,url,"Reset Your Password");

        res.status(200).json({alert:"please check the email"});

    }catch (e){
        console.log(e.message);
        return res.status(500).json({alert:"server Error"});
    }
}

//Reseting user PW
const resetPassword = async (req, res)=>{
    try{
        const {password}= req.body;

        const passwordHash = await bcrypt.hash(password,12)

        await UserSchema.findOneAndUpdate({_id:req.user.id},{
            password:passwordHash
        });
        res.status(200).json({alert:"Password Reset Successful"})
    }catch (e){
        console.log(e.message);
        return res.status(500).json({alert:"server Error"});
    }
}
const AdminResetPasswordUser = async (req, res)=>{
    try{
            const {new_password}= req.body;

            const passwordHash = await bcrypt.hash(new_password,12)

            await UserSchema.updateOne({_id:req.params.id},{
                $set: { password:passwordHash}
            });
            console.log(passwordHash)
        res.status(200).json({alert:"Password Successful"})
    }catch (e){
        console.log(e.message);
        return res.status(500).json({alert:"server Error"});
    }
}
const getUserAll =async (req,res)=>{
    try{
        const users = await UserSchema.find().select('-password')

        res.json(users)
    }catch (e){
        console.log(e.message);
        return res.status(500).json({alert:"server Error"});
    }
}

const getCounsellorList =async (req,res)=>{
    try{
        const users = await UserSchema.find({ position: "doctor" }).select('-password')

        res.json(users)
    }catch (e){
        console.log(e.message);
        return res.status(500).json({alert:"server Error"});
    }
}

const updateProfile = async (req,res)=>{
    try{
        const {firstName,lastName,address,mobileNo,DOB,Gender,imageUrl} =req.body
        await UserSchema.findOneAndUpdate({_id:req.user.id},{
            firstName,lastName,address,mobileNo,DOB,Gender,imageUrl
        })
        res.status(200).json({alert:"update Successful"})
    }catch (e){
        console.log(e.message);
        return res.status(500).json({alert:"server Error"});
    }
}
const updateAdminUser = async (req, res) => {
    if (req.params && req.params.id) {
        UserSchema.findByIdAndUpdate(
            req.params.id,
            {
                $set:req.body
            },
            (err)=>{
                if(err){
                    return res.status(400).json({error:err});
                }
                return res.status(200).json({success:"Update Successfully"});
            }
        )

    }
}
const deleteUsers = async (req, res) => {
    if (req.params && req.params.id) {
        console.log(req.params.id);
        await UserSchema.findByIdAndDelete(req.params.id)
            .then(() => res.json('User Deleted Successful!'))
            .catch(error => {
                res.status(500).send({ error: error.message });
            });
    }
}

//Activating the jwt tocken
const ActivationToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET,{expiresIn:'1h'})
}

function validateEmail(user_email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(user_email).toLowerCase());
}

module.exports = {
    addUsers,
    UserActiveEmail,
    login,
    getSpecificUser,
    adminAddUsers,
    forgotPassword,
    resetPassword,
    updateProfile,
    deleteUsers,
    getUserAll,
    getCounsellorList,
    updateAdminUser,
    getSpecificAdminUsers,
    AdminResetPasswordUser
}
