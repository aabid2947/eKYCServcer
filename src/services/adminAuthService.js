
import Admin from '../models/AdminModel.js';
import generateToken from '../utils/generateToken.js';

// NOTE: In a real-world production app, you might disable this endpoint
// or protect it with a super-admin key after the first admin is created.
export const registerAdmin = async (adminData) => {
  const { name, email, password } = adminData;

  const adminExists = await Admin.findOne({ email });
  if (adminExists) {
    throw new Error('Admin with that email already exists');
  }

  const admin = await Admin.create({ name, email, password });

  if (admin) {
    return {
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    };
  } else {
    throw new Error('Invalid admin data');
  }
};

export const loginAdmin = async (loginData) => {
  const { email, password } = loginData;

  const admin = await Admin.findOne({ email }).select('+password');
  if (!admin) {
    // Use a generic error message for security
    throw new Error('Invalid credentials');
  }

  const isMatch = await admin.matchPassword(password);
  if (!isMatch) {
    throw new Error('Invalid credentials');
  }

  // Generate a token specific to this admin
  const token = generateToken(admin._id);

  return {
    _id: admin._id,
    name: admin.name,
    email: admin.email,
    token,
  };
};