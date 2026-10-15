// Owner-approved review-candidate policy; never deletes records or backups.
if(process.argv[2]!=="--apply-owner-approved-20261016")throw Error("Explicit owner-approved action flag required");
const {pool,closeDb}=await import("../server/dist/db.js");
const {applyOwnerApprovedFreeRetention}=await import("../server/dist/tuitionRetention.js");
try{console.log(JSON.stringify(await applyOwnerApprovedFreeRetention(pool)));}finally{await closeDb();}
