// backend/config/passport.js
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as TwitterStrategy } from 'passport-twitter';
import { Strategy as LinkedInStrategy } from 'passport-linkedin-oauth2';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

// Serialize & deserialize
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) =>
  User.findById(id, (err, user) => done(err, user))
);

// Google OAuth
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ email: profile.emails[0].value });
    if (!user) {
      user = new User({ username: profile.displayName, email: profile.emails[0].value });
      await user.save();
    }
    done(null, user);
  } catch (err) {
    done(err, null);
  }
}));

// Twitter OAuth
passport.use(new TwitterStrategy({
  consumerKey: process.env.TWITTER_API_KEY,
  consumerSecret: process.env.TWITTER_API_SECRET,
  callbackURL: '/api/auth/twitter/callback',
}, async (token, tokenSecret, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value || `${profile.id}@twitter.com`;
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ username: profile.displayName, email });
      await user.save();
    }
    done(null, user);
  } catch (err) {
    done(err, null);
  }
}));

// LinkedIn OAuth
passport.use(new LinkedInStrategy({
  clientID: process.env.LINKEDIN_CLIENT_ID,
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  callbackURL: '/api/auth/linkedin/callback',
  scope: ['r_emailaddress', 'r_liteprofile'],
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ email: profile.emails[0].value });
    if (!user) {
      user = new User({ username: profile.displayName, email: profile.emails[0].value });
      await user.save();
    }
    done(null, user);
  } catch (err) {
    done(err, null);
  }
}));

// Facebook OAuth
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_CLIENT_ID,
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  callbackURL: '/api/auth/facebook/callback',
  profileFields: ['id', 'displayName', 'emails'],
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value || `${profile.id}@facebook.com`;
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ username: profile.displayName, email });
      await user.save();
    }
    done(null, user);
  } catch (err) {
    done(err, null);
  }
}));

export default passport;
