import bcrypt from "bcrypt";
import User from "../models/user";
import Role from "../models/role";
import { AUTH_ERRORS } from "../utils/constants";

export const GetUserByID = async (id: string) => {
  const user = await User.findById(id).populate([{ path: "role" }, { path: "organization" }]);
  if (!user || user.isdeleted || user.isdisable) {
    throw new Error(AUTH_ERRORS.EMAIL_NOT_FOUND);
  }
  return user;
};

export const GetUserByEmail = async (email: string) => {
  const user = await User.findOne({ email }).populate("role");
  if (!user || user.isdeleted || user.isdisable) {
    throw new Error(AUTH_ERRORS.EMAIL_NOT_FOUND);
  }
  return user;
};

export const CreateAnUser = async (
  email: string,
  password: string,
  fullname: string,
  role: string
) => {
  const roleObj = await Role.findOne({ name: role });
  if (!roleObj) {
    throw new Error(AUTH_ERRORS.ROLE_NOT_FOUND);
  }
  const newUser = new User({
    email,
    password,
    fullname,
    role: roleObj._id,
  });
  return await newUser.save();
};

export const CheckLogin = async (email: string, password: string) => {
  const user = await GetUserByEmail(email);
  if (!bcrypt.compareSync(password, user.password)) {
    throw new Error(AUTH_ERRORS.EMAIL_AND_PASSWORD_WRONG);
  }
  return (user._id as string | { toString(): string }).toString();
};