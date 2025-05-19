const { createTaskGroup } = require("../tasks");
const { createModuleTask } = require("../tasks");
const eventEmitter = require("../events");

const params = {
  image:
    "https://pbs.twimg.com/profile_images/1815769204076822528/QspI9k-9_400x400.jpg",
  gasFeeRequired: false,
  others: [],
};

async function saveModuleTasks(data) {
  const taskGroupId = await createTaskGroup(
    data.taskGroupName,
    params.contractAddress,
    params.chainId,
    "MODULE",
    data.moduleName,
  );

  const wallets = data.wallets;
  const rpcs = [];
  let config = {};

  config.slug = data.Slug;

  createModuleTask(taskGroupId, wallets, rpcs, config);
}

async function runModuleTasks(taskId, result, signal) {
  eventEmitter.emit("update-task-status", {
    id: taskId,
    text: "submitting",
    color: "secondary",
  });
  const response = await fetch(
    `https://agent.api.eternalai.org/api/cryptoagent/user`,
    {
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({
        address: result.address,
        username: Math.random().toString(36).substr(2, 9),
      }),
    },
  );
  const data = await response.json();
  console.log(result.address);

  if (signal?.aborted) {
    console.log("task stopped");

    return;
  }
  eventEmitter.emit("update-task-status", {
    id: taskId,
    text: data.result ? "success" : "failed",
    color: data.result ? "success" : "danger",
    isRunning: false,
  });
}

module.exports = { params, saveModuleTasks, runModuleTasks };
