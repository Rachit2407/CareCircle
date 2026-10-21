import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { User } from '../modules/users/user.model.js';
import { CareRelationship } from '../modules/relationships/careRelationship.model.js';
import { CareTask } from '../modules/tasks/task.model.js';
import { MedicationSchedule } from '../modules/medications/medication.model.js';

export const seed = async (): Promise<void> => {
  // Hard refusal in production
  if (process.env.NODE_ENV === 'production' || env.NODE_ENV === 'production') {
    console.error('❌ Refusing to seed database in production environment.');
    process.exit(1);
  }

  console.log('🌱 Starting CareCircle database seed...');
  await connectDatabase();

  try {
    const passwordHash = await bcrypt.hash('Demo-pass-123', 10);

    // 1. Seed or update Demo Caregiver (matches frontend DEMO_CREDENTIALS)
    let caregiver = await User.findOne({ email: 'demo@carecircle.test' });
    if (!caregiver) {
      caregiver = await User.create({
        displayName: 'Anita Rao',
        email: 'demo@carecircle.test',
        passwordHash,
        role: 'caregiver',
        timezone: 'Asia/Kolkata',
        phone: '+919876543210',
        tokenVersion: 0,
      });
      console.log('   ✓ Created demo caregiver: demo@carecircle.test (Anita Rao)');
    } else {
      caregiver.passwordHash = passwordHash;
      caregiver.displayName = 'Anita Rao';
      caregiver.role = 'caregiver';
      caregiver.timezone = 'Asia/Kolkata';
      await caregiver.save();
      console.log('   ✓ Updated demo caregiver: demo@carecircle.test (Anita Rao)');
    }

    // 2. Seed or update Demo Patient
    let patient = await User.findOne({ email: 'raghav.rao@carecircle.test' });
    if (!patient) {
      patient = await User.create({
        displayName: 'Raghav Rao',
        email: 'raghav.rao@carecircle.test',
        passwordHash,
        role: 'patient',
        timezone: 'Asia/Kolkata',
        phone: '+919876543211',
        tokenVersion: 0,
      });
      console.log('   ✓ Created demo patient: raghav.rao@carecircle.test (Raghav Rao)');
    } else {
      patient.passwordHash = passwordHash;
      patient.displayName = 'Raghav Rao';
      patient.role = 'patient';
      patient.timezone = 'Asia/Kolkata';
      await patient.save();
      console.log('   ✓ Updated demo patient: raghav.rao@carecircle.test (Raghav Rao)');
    }

    // 3. Seed active CareRelationship
    let relationship = await CareRelationship.findOne({
      patientId: patient._id,
      caregiverId: caregiver._id,
    });

    if (!relationship) {
      relationship = await CareRelationship.create({
        patientId: patient._id,
        caregiverId: caregiver._id,
        relationshipType: 'Primary caregiver',
        consentStatus: 'active',
        permissions: [
          'manage_tasks',
          'manage_medications',
          'manage_appointments',
          'manage_health_readings',
          'view_records',
          'upload_records',
          'receive_alerts',
        ],
        notes: 'Daughter and primary caregiver for Raghav Rao',
      });
      console.log('   ✓ Created active care relationship between Anita Rao and Raghav Rao');
    } else {
      relationship.consentStatus = 'active';
      relationship.relationshipType = 'Primary caregiver';
      await relationship.save();
      console.log('   ✓ Verified active care relationship');
    }

    // 4. Seed sample tasks for Raghav Rao
    const taskCount = await CareTask.countDocuments({ patientId: patient._id });
    if (taskCount === 0) {
      await CareTask.create([
        {
          patientId: patient._id,
          createdBy: caregiver._id,
          title: 'Morning blood pressure check',
          description: 'Record sitting BP reading before breakfast',
          priority: 'high',
          status: 'pending',
          dueAt: new Date(Date.now() + 2 * 3600 * 1000),
          recurrence: 'daily',
        },
        {
          patientId: patient._id,
          createdBy: caregiver._id,
          title: 'Evening walk in the garden',
          description: '20 minutes assisted stroll',
          priority: 'medium',
          status: 'pending',
          dueAt: new Date(Date.now() + 8 * 3600 * 1000),
          recurrence: 'daily',
        },
      ]);
      console.log('   ✓ Seeded initial care tasks for demo patient');
    }

    // 5. Seed sample medications for Raghav Rao
    const medCount = await MedicationSchedule.countDocuments({ patientId: patient._id });
    if (medCount === 0) {
      await MedicationSchedule.create([
        {
          patientId: patient._id,
          medicationName: 'Amlodipine',
          dosage: '5mg',
          instructions: 'Take 1 tablet every morning with water after food',
          recurrence: {
            frequency: 'daily',
            times: ['08:00'],
          },
          timezone: 'Asia/Kolkata',
          startAt: new Date(),
          prescribedBy: 'Dr. S. Nair (Cardiology)',
          active: true,
        },
        {
          patientId: patient._id,
          medicationName: 'Metformin',
          dosage: '500mg',
          instructions: 'Take with meals',
          recurrence: {
            frequency: 'twice_daily',
            times: ['08:30', '20:30'],
          },
          timezone: 'Asia/Kolkata',
          startAt: new Date(),
          prescribedBy: 'Dr. V. Sharma (Endocrinology)',
          active: true,
        },
      ]);
      console.log('   ✓ Seeded initial medication schedules for demo patient');
    }

    console.log('\n✅ Database seeded successfully!');
    console.log('----------------------------------------------------');
    console.log('Demo Credentials for Frontend:');
    console.log('  Email:    demo@carecircle.test');
    console.log('  Password: Demo-pass-123');
    console.log('  Role:     Primary Caregiver (Anita Rao)');
    console.log('  Patient:  Raghav Rao (Asia/Kolkata)');
    console.log('----------------------------------------------------\n');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
};

// Execute if run directly from CLI
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
