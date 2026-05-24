const { connect, mongoose } = require('./mongo');

const ProductSchema = new mongoose.Schema({
  nombre: String,
  descripcion: String,
  categoria: String,
  precio: Number,
  imagen: String,
  destacado: Boolean,
  slug: String,
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  username: String,
  email: String,
  passwordHash: String,
}, { timestamps: true });

const ResetTokenSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  token: String,
  expiresAt: Date,
}, { timestamps: true });

async function getModels() {
  await connect();
  const models = {};
  models.Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
  models.User = mongoose.models.User || mongoose.model('User', UserSchema);
  models.ResetToken = mongoose.models.ResetToken || mongoose.model('ResetToken', ResetTokenSchema);
  return models;
}

module.exports = { getModels };
