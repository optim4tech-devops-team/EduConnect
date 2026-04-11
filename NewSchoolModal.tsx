import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  CircularProgress,
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { tr } from 'date-fns/locale';

// API'ye gönderilecek veri modeli
export interface CreateSchoolRequest {
  name: string;
  plan: 'Basic' | 'Standard' | 'Premium';
  maxStudents: number;
  maxTeachers: number;
  subscriptionEndsAt?: Date | null;
  adminEmail?: string; // Yönetici atamak için e-posta
}

interface NewSchoolModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: CreateSchoolRequest) => Promise<void>;
}

const INITIAL_STATE: CreateSchoolRequest = {
  name: '',
  plan: 'Basic',
  maxStudents: 50,
  maxTeachers: 10,
  subscriptionEndsAt: null,
  adminEmail: '',
};

export default function NewSchoolModal({ open, onClose, onSave }: NewSchoolModalProps) {
  const [formState, setFormState] = useState<CreateSchoolRequest>(INITIAL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Modal her açıldığında formu sıfırla
    if (open) {
      setFormState(INITIAL_STATE);
    }
  }, [open]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormState(prev => ({
      ...prev,
      [name]: name === 'maxStudents' || name === 'maxTeachers' ? (value === '' ? '' : Number(value)) : value,
    }));
  };

  const handlePlanChange = (event: SelectChangeEvent) => {
    setFormState(prev => ({
      ...prev,
      plan: event.target.value as CreateSchoolRequest['plan'],
    }));
  };

  const handleDateChange = (date: Date | null) => {
    setFormState(prev => ({ ...prev, subscriptionEndsAt: date }));
  };

  const handleSubmit = async () => {
    // Basit bir doğrulama
    if (!formState.name || !formState.maxStudents || !formState.maxTeachers) {
      alert('Lütfen zorunlu alanları doldurun.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formState);
      onClose(); // Başarılı olursa kapat
    } catch (error) {
      console.error("Failed to save school", error);
      alert('Okul kaydedilirken bir hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={tr}>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Yeni Okul Ekle</DialogTitle>
        <DialogContent dividers>
          <TextField autoFocus margin="dense" name="name" label="Okul Adı" type="text" fullWidth variant="outlined" value={formState.name} onChange={handleChange} required />
          <FormControl fullWidth margin="dense" required>
            <InputLabel id="plan-select-label">Abonelik Planı</InputLabel>
            <Select labelId="plan-select-label" name="plan" value={formState.plan} label="Abonelik Planı" onChange={handlePlanChange}>
              <MenuItem value="Basic">Basic</MenuItem>
              <MenuItem value="Standard">Standard</MenuItem>
              <MenuItem value="Premium">Premium</MenuItem>
            </Select>
          </FormControl>
          <TextField margin="dense" name="maxStudents" label="Maksimum Öğrenci Sayısı" type="number" fullWidth variant="outlined" value={formState.maxStudents} onChange={handleChange} required />
          <TextField margin="dense" name="maxTeachers" label="Maksimum Öğretmen Sayısı" type="number" fullWidth variant="outlined" value={formState.maxTeachers} onChange={handleChange} required />
          <DatePicker
            label="Abonelik Bitiş Tarihi"
            value={formState.subscriptionEndsAt}
            onChange={handleDateChange}
            sx={{ width: '100%', mt: 1, mb: 0.5 }}
            slotProps={{ textField: { margin: 'dense' } }}
          />
          <TextField
            margin="dense"
            name="adminEmail"
            label="Okul Yöneticisi E-posta (Opsiyonel)"
            type="email"
            fullWidth
            variant="outlined"
            value={formState.adminEmail}
            onChange={handleChange}
            helperText="Bu e-postaya sahip kullanıcıya SchoolAdmin rolü atanacaktır."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} disabled={isSubmitting}>İptal</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={isSubmitting} startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}>
            {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}