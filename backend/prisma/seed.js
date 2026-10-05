const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
const hash = (p) => bcrypt.hash(p, 12);

async function main(){
  await prisma.auditLog.deleteMany(); await prisma.notification.deleteMany(); await prisma.factoryTransaction.deleteMany();
  await prisma.mLPrediction.deleteMany(); await prisma.productionRecord.deleteMany(); await prisma.inventory.deleteMany();
  await prisma.dailyPrice.deleteMany(); await prisma.tapperEstateAssignment.deleteMany(); await prisma.factory.deleteMany();
  await prisma.estate.deleteMany(); await prisma.user.deleteMany();

  const admin = await prisma.user.create({data:{fullName:'System Admin',email:'admin@rubbermis.com',passwordHash:await hash('Admin123'),role:'ADMIN',phone:'0770000001'}});
  const tapper = await prisma.user.create({data:{fullName:'Sample Tapper',email:'tapper@rubbermis.com',passwordHash:await hash('Tapper123'),role:'TAPPER',phone:'0770000002'}});
  const tapper2 = await prisma.user.create({data:{fullName:'Second Tapper',email:'tapper2@rubbermis.com',passwordHash:await hash('Tapper123'),role:'TAPPER'}});
  const owner = await prisma.user.create({data:{fullName:'Estate Owner',email:'owner@rubbermis.com',passwordHash:await hash('Owner123'),role:'ESTATE_OWNER',phone:'0770000003'}});
  const manager = await prisma.user.create({data:{fullName:'Factory Manager',email:'factory@rubbermis.com',passwordHash:await hash('Factory123'),role:'FACTORY_MANAGER',phone:'0770000004'}});
  const estate = await prisma.estate.create({data:{estateName:'Kegalle Green Rubber Estate',location:'Kegalle, Sri Lanka',ownerId:owner.id}});
  const factory = await prisma.factory.create({data:{factoryName:'Colombo Rubber Buyers',location:'Colombo, Sri Lanka',managerId:manager.id}});
  await prisma.tapperEstateAssignment.createMany({data:[
    {tapperId:tapper.id,estateId:estate.id,tapperSharePercentage:40,ownerSharePercentage:60,startDate:new Date('2026-01-01')},
    {tapperId:tapper2.id,estateId:estate.id,tapperSharePercentage:45,ownerSharePercentage:55,startDate:new Date('2026-01-01')}
  ]});
  const today = new Date(); today.setHours(0,0,0,0);
  await prisma.dailyPrice.create({data:{factoryId:factory.id,date:today,q1Price:950,q2Price:825,q3Price:700,createdBy:manager.id}});
  const record = await prisma.productionRecord.create({data:{tapperId:tapper.id,estateId:estate.id,date:today,sheetCount:120,weightKg:40,remarks:'Seed approved record',status:'PENDING_FACTORY_GRADING',ownerApprovalStatus:'APPROVED',ownerApprovedBy:owner.id,ownerApprovedAt:new Date(),locked:true}});
  await prisma.mLPrediction.create({data:{productionRecordId:record.id,imageUrl:'/demo/rubber.jpg',predictedGrade:'Q1',confidenceScore:82.5,modelVersion:'mock-v1',predictionType:'FACTORY_FINAL_GRADING'}});
  await prisma.inventory.createMany({data:[{factoryId:factory.id,grade:'Q1',totalWeightKg:0},{factoryId:factory.id,grade:'Q2',totalWeightKg:0},{factoryId:factory.id,grade:'Q3',totalWeightKg:0}]});
  await prisma.notification.createMany({data:[{userId:owner.id,title:'Seed data ready',message:'Sample estate data is ready.',type:'INFO'},{userId:manager.id,title:'Approved batch waiting',message:'A sample batch is ready for factory grading.',type:'WARNING'}]});
  await prisma.auditLog.create({data:{userId:admin.id,action:'SEED_DATABASE',entityType:'System',entityId:'seed',newValue:{message:'Initial data created'}}});
  console.log('Seed completed.');
}
main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>prisma.$disconnect());
