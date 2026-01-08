const qcLabSamplesService = require('./qcLabSamples.service');
const smsRegisterService = require('./smsRegister.service');
const hotCoilService = require('./hotCoil.service');
const reCoilerService = require('./reCoiler.service');
const pipeMillService = require('./pipeMill.service');
const laddleChecklistService = require('./laddleChecklist.service');
const tundishChecklistService = require('./tundishChecklist.service');
const laddleReturnService = require('./laddleReturn.service');

const getDashboardData = async () => {
  const [
    qcLabSamples,
    smsRegisters,
    hotCoilEntries,
    reCoilerEntries,
    pipeMillEntries,
    laddleChecklistEntries,
    tundishChecklistEntries,
    laddleReturnEntries
  ] = await Promise.all([
    qcLabSamplesService.listSamples({}),
    smsRegisterService.listSmsRegisters({}),
    hotCoilService.listHotCoilEntries({}),
    reCoilerService.listReCoilerEntries({}),
    pipeMillService.listPipeMillEntries({}),
    laddleChecklistService.listLaddleChecklists({}),
    tundishChecklistService.listTundishChecklists({}),
    laddleReturnService.listLaddleReturns({})
  ]);

  const counts = {
    qc_lab_samples: qcLabSamples.length,
    sms_register: smsRegisters.length,
    hot_coil: hotCoilEntries.length,
    re_coiler: reCoilerEntries.length,
    pipe_mill: pipeMillEntries.length,
    laddle_checklist: laddleChecklistEntries.length,
    tundish_checklist: tundishChecklistEntries.length,
    laddle_return: laddleReturnEntries.length
  };

  // Get recent entries (last 10 from each table)
  const recentEntries = {
    qc_lab_samples: qcLabSamples.slice(0, 10),
    sms_register: smsRegisters.slice(0, 10),
    hot_coil: hotCoilEntries.slice(0, 10),
    re_coiler: reCoilerEntries.slice(0, 10),
    pipe_mill: pipeMillEntries.slice(0, 10),
    laddle_checklist: laddleChecklistEntries.slice(0, 10),
    tundish_checklist: tundishChecklistEntries.slice(0, 10),
    laddle_return: laddleReturnEntries.slice(0, 10)
  };

  return {
    counts,
    recentEntries,
    summary: {
      totalEntries: Object.values(counts).reduce((sum, count) => sum + count, 0),
      lastUpdated: new Date().toISOString()
    }
  };
};

module.exports = { getDashboardData };









