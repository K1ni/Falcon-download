const { ethers } = require("ethers");

const { createTaskGroup } = require("../tasks");
const { createEVMTask, createModuleTask } = require("../tasks");
const { getMintData } = require("../opensea/getMintData");
const { mint } = require("../mint");
const eventEmitter = require("../events");

const params = {
  image:
    "https://i2.seadn.io/base/cbfb3c82cb7d4d308b50a09ff06bf7fb/40aa06b2909afe021b457b45bf702f/3c40aa06b2909afe021b457b45bf702f.jpeg?w=3840",
  //string
  chainId: "8453",
  value: "0",
  NFTAddress: "0xb5b26316d2144fc12ed6248bb50fc5dd5bce4283",
  contractAddress: "0x00005ea00ac477b1030ce78506496e8c2de24bf5",
  //gasFeeRequired: false,
  //walletsRequired: false,
  others: [
    { name: "Amount", type: "input", defaultValue: "1" },
    {
      name: "Phase",
      type: "select",
      values: ["WL", "Public"],
    },
    {
      name: "getSignature_interval",
      type: "input",
      defaultValue: "500",
      endContent: "ms",
    },
  ],
};

async function saveModuleTasks(data) {
  if (data.Phase === "Public") {
    await savePublicPhaseTasks(data);

    return;
  }
  const taskGroupId = await createTaskGroup(
    data.taskGroupName,
    params.contractAddress,
    params.chainId,
    "MODULE",
    data.moduleName,
  );

  const wallets = data.wallets;
  const rpcs = data.rpcs;
  let config = {};

  config.maxFeePerGas = data.maxFeePerGas || "auto";
  config.priorityFee = data.priorityFee || "auto";
  config.getSignature_interval = data.getSignature_interval || "1000";
  //config.Phase = data.Phase || "SWATCHES CLAIM";

  createModuleTask(taskGroupId, wallets, rpcs, config);
  eventEmitter.emit("showAlert", {
    title: `created successfully`,
    color: "success",
  });
}

async function savePublicPhaseTasks(data) {
  const taskGroupId = await createTaskGroup(
    data.taskGroupName,
    params.contractAddress,
    params.chainId,
  );

  // 设置基础参数
  const baseData = {
    wallets: data.wallets,
    rpcs: data.rpcs,
    maxFeePerGas: data?.maxFeePerGas || "auto",
    priorityFee: data?.priorityFee || "auto",
    nonce: "auto",
    gasLimit: "auto",
    isSimulate: true,
    simulate_interval: data?.simulate_interval || "1000",
    trigger_mode: false,
    timestamp: "none",
    value: params.value,
  };

  const ABI = [
    {
      inputs: [
        {
          internalType: "address",
          name: "nftContract",
          type: "address",
        },
        {
          internalType: "address",
          name: "feeRecipient",
          type: "address",
        },
        {
          internalType: "address",
          name: "minterIfNotPayer",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "quantity",
          type: "uint256",
        },
      ],
      name: "mintPublic",
      outputs: [],
      stateMutability: "payable",
      type: "function",
    },
  ];

  // 创建interface实例
  const iface = new ethers.Interface(ABI);
  // 修改claim函数的参数
  const hex = iface.encodeFunctionData("mintPublic", [
    params.NFTAddress,
    "0x0000a26b00c1f0df003000390027140000faa719",
    "0x0000000000000000000000000000000000000000",
    data.Amount, // quantity
  ]);

  // 将 rpcs 数组转换为单个字符串数组
  const taskData = {
    ...baseData,
    hex: hex,
  };

  await createEVMTask(taskGroupId, taskData);

  eventEmitter.emit("showAlert", {
    title: `created successfully`,
    color: "success",
  });
}

async function runModuleTasks(taskId, result, signal) {
  let transactionSubmissionData;

  while (true) {
    if (signal?.aborted) {
      console.log("task stopped");

      return;
    }

    eventEmitter.emit("update-task-status", {
      id: taskId,
      text: "getting signature",
      color: "secondary",
    });
    //console.log(result);

    const data = await getMintData(
      result.address,
      params.chainId,
      params.NFTAddress,
      1,
    );

    console.log(
      data?.extensions?.debugInfo?.additionalInformation?.[
        "x-ratelimit-remaining"
      ],
    );

    if (data?.data?.swap?.errors?.length > 0) {
      if (signal?.aborted) {
        console.log("task stopped");

        return;
      }
      eventEmitter.emit("update-task-status", {
        id: taskId,
        text: data.data.swap.errors[0].__typename,
        color: "secondary",
      });
    } else if (data?.errors?.length > 0) {
      if (signal?.aborted) {
        console.log("task stopped");

        return;
      }
      console.error(data.errors);
      eventEmitter.emit("update-task-status", {
        id: taskId,
        text: data.errors[0].message,
        color: "secondary",
      });
    } else if (data?.data?.swap?.actions?.[0]?.transactionSubmissionData) {
      transactionSubmissionData =
        data.data.swap.actions[0].transactionSubmissionData;
      break;
    }

    await new Promise((resolve) =>
      setTimeout(resolve, JSON.parse(result.config).getSignature_interval),
    );
  }

  const hex = transactionSubmissionData.data;
  //const toAddress = transactionSubmissionData.to;
  //const value = transactionSubmissionData.value;

  await mint({
    group_id: result.group_id,
    id: taskId,
    hex,
    contractAddress: params.contractAddress,
    value: params.value,
    rpc_url: result.rpc_url,
    signal,
    nonce: "auto",
    maxFeePerGas: JSON.parse(result.config).maxFeePerGas,
    priorityFee: JSON.parse(result.config).priorityFee,
    chainId: params.chainId,
    private_key: result.private_key,
    gasLimit: "auto",
    is_simulate: true,
    simulate_interval: 1000,
    timestamp: "none",
  });
}

module.exports = { params, saveModuleTasks, runModuleTasks };
