const { createTaskGroup } = require("../tasks");
const { createEVMTask } = require("../tasks");
const params = {
  image:
    "https://pbs.twimg.com/profile_images/1780640532793901056/oo8-1trF_400x400.jpg",
  contractAddress: "0x07783d91eb43aa9f0f4fa643737cf659d73c481c",
  //string
  chainId: "42161",
  gasFeeRequired: false,
  //walletsRequired: false,
  others: [
    // { name: "Amount", type: "input", defaultValue: "1" },
    {
      name: "Phase",
      type: "select",
      values: ["GTD", "FCFS", "Public"],
    },
    {
      name: "simulate_interval",
      type: "input",
      defaultValue: "1000",
      endContent: "ms",
    },
  ],
};

async function saveModuleTasks(data) {
  const taskGroupId = await createTaskGroup(
    data.taskGroupName,
    params.contractAddress,
    params.chainId,
  );
  const mintId = (() => {
    switch (data.Phase) {
      case "GTD":
        return 1;
      case "FCFS":
        return 2;
      case "Public":
        return 3;
    }
  })();

  data.maxFeePerGas = "0.05";
  data.priorityFee = "0";
  data.nonce = "auto";
  data.gasLimit = "auto";
  data.isSimulate = true;
  data.trigger_mode = false;
  data.timestamp = "none";
  data.hex = `0x0ed64eff0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000${mintId}`;
  switch (mintId) {
    case 1:
      data.value = "0";
      break;
    case 2:
      data.value = "0";
      break;
    default:
      data.value = "0";
  }

  createEVMTask(taskGroupId, data);
}

async function runModuleTasks(taskId) {
  console.log("runModuleTasks", taskId);
}

module.exports = { params, saveModuleTasks, runModuleTasks };
