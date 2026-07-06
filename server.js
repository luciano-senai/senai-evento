import express from 'express';
import cors from 'cors';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import * as yup from 'yup';
import { parse, isDate } from 'date-fns';

dotenv.config();

const app = express();

app.use(cors());

app.use(express.json());

initializeApp({
  credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS)
});

const db = getFirestore();

function parseCustomDate(value, originalValue) {
  if (isDate(originalValue)) return originalValue; 
  return parse(originalValue, 'dd/MM/yyyy', new Date());
}

const createSchema = yup.object({
  titulo: yup.string().required('Título inválido').min(3, 'Mínimo 3 characters'),
  descricao: yup.string().required('Descrição inválido').min(3, 'Mínimo 3 characters'),
  local: yup.string().required('Local inválido').min(3, 'Mínimo 3 characters'),
  data: yup.date().transform(parseCustomDate).typeError('Data inválida').required(),
  valor: yup.number().typeError('Valor inválido').required(),
  //imagem: yup.string().required('Imagem inválido').min(3, 'Mínimo 3 characters')
});

app.post('/:user/eventos', async (req, res) => {
  try {
    const user = req.params.user;
   
    const newEvento = await createSchema.validate(req.body, { abortEarly: false });
    
    const newDoc = await db.collection(`/users/${user}/eventos`).add({
      titulo: newEvento.titulo,
      descricao:newEvento. descricao,
      data: new Date().toISOString(),
      local: newEvento.local,
      imagem: newEvento.imagem || '',
      valor: newEvento.valor,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({ id: newDoc.id, message: 'Evento criado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/:user/eventos', async (req, res) => {
  try {
    const user = req.params.user;

    if (!user) return res.status(400).json({ error: 'User not defined' });

    const snapshot = await db.collection(`/users/${user}/eventos`).get();
    const items = [];
    
    snapshot.forEach(doc => {
      items.push({ id: doc.id, ...doc.data() });
    });

    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/:user/eventos/:id', async (req, res) => {
  try {
    const user = req.params.user;
    const docRef = db.collection(`/users/${user}/eventos`).doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Evento não encontrado' });
    }

    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/:user/eventos/:id', async (req, res) => {
  try {
    const user = req.params.user;
    const docRef = db.collection(`/users/${user}/eventos`).doc(req.params.id);    
    const doc = await docRef.get();

    if (!doc.exists) return res.status(404).json({ error: 'Evento não encontrado' });

    await docRef.update(req.body);
    res.status(200).json({ message: 'Evento atualizado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/:user/eventos/:id', async (req, res) => {
  try {
    const user = req.params.user;
    const docRef = db.collection(`/users/${user}/eventos`).doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists) return res.status(404).json({ error: 'Evento não encontrado' });

    await docRef.delete();
    res.status(200).json({ message: 'Evento excluído com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
