import React, { useState, useEffect, ReactNode } from "react";
import { useAccount } from "wagmi";
import { useEthersSigner } from "@/utils/signer";
import { ethers, BigNumber, Contract } from "ethers";
import toast from "react-hot-toast";
import {
  tokenAbi,
  mainContractABI,
  Addresses,
  nftContractAbi,
  conversionContractAbi,
} from "@/constant/index";

// Context types
interface DataContextProps {
  tokenBalance: {
    usdeBalance: number;
    buzzBalance: number;
  };
  getContractInstance: (
    contractAddress: string,
    contractAbi: any
  ) => Promise<Contract | undefined>;
  getTokenBalance: () => Promise<BigNumber | undefined>;
  createPool: (
    pollName: string,
    deadline: number,
    question: string,
    link: string,
    parameter: string,
    keyword: string,
    type: number
  ) => Promise<void>;
  placeBet: (
    poolId: number,
    amount: BigNumber,
    targetScore: number
  ) => Promise<void>;
  claimBet: (poolId: number) => Promise<void>;
  getPoolsDetails: (poolId: number) => Promise<any>;
  totalPools: [] | undefined;
  userBetsData: [] | undefined;
  loading: boolean;
  setResultScore: (poolId: number, score: number) => Promise<void>;
  isOpen: boolean;
  openSideBar: () => void;
  closeSideBar: () => void;
  activePoolId: number;
  setActivePoolId: (id: number) => void;
  formatTimestamp: (timestamp: number) => string;
  mintNft: () => Promise<void>;
  nftMintedAllReady: boolean;
  convertUSDetoBuzz: (amount: number) => Promise<void>;
  convertBuzztoUSDe: (amount: number) => Promise<void>;
}

interface DataContextProviderProps {
  children: ReactNode;
}

// Context initialization
const DataContext = React.createContext<DataContextProps | undefined>(
  undefined
);

const DataContextProvider: React.FC<DataContextProviderProps> = ({
  children,
}) => {
  const NFT_URI =
    "https://gateway.pinata.cloud/ipfs/bafkreifsghmurcvqcer5axfj4jaryfa42gxmqgqv3pkjl56g2k6bcigq4u/";
  const [tokenBalance, setTokenBalance] = useState<BigNumber | undefined>({
    usdeBalance: 0,
    buzzBalance: 0,
  });
  const { address, chain } = useAccount();
  const [totalPools, setTotalPools] = useState<{}>({});
  const [userBetsData, setUserBetsData] = useState(null);
  const [nftMintedAllReady, setNftMintedAllReady] = useState(false);
  const [activeChain, setActiveChainId] = useState<number | undefined>(
    chain?.id
  );
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activePoolId, setActivePoolId] = useState(0);
  const openSideBar = () => {
    setIsOpen(!isOpen);
  };
  const closeSideBar = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    setActiveChainId(chain?.id);
  }, [chain?.id]);

  const signer = useEthersSigner({ chainId: activeChain });

  const getContractInstance = async (
    contractAddress: string,
    contractAbi: any
  ): Promise<Contract | undefined> => {
    try {
      const contractInstance = new ethers.Contract(
        contractAddress,
        contractAbi,
        signer
      );
      return contractInstance;
    } catch (error) {
      console.log("Error in deploying contract");
      return undefined;
    }
  };

  const getTokenBalance = async () => {
    try {
      const tokenContract = await getContractInstance(
        Addresses[activeChain]?.tokenAddress,
        tokenAbi
      );
      if (tokenContract) {
        console.log("Token contract", tokenContract);
        let balance = await tokenContract.balanceOf(address);
        setTokenBalance({
          usdeBalance: +balance.div(BigNumber.from(10).pow(18)).toString(),
          buzzBalance: 0,
        });
        console.log("Token balance", balance);
        return balance;
      }
    } catch (error) {
      console.log("Error in getting token balance");
      return BigNumber.from(0);
    }
  };

  const convertUSDetoBuzz = async (amount: any) => {
    let id = toast.loading("Converting USDe to BUZZ...");
    try {
      amount = ethers.utils.parseEther(amount.toString());
      const conversionContract = await getContractInstance(
        Addresses[activeChain]?.conversionAddress,
        conversionContractAbi
      );

      const tokenContract = await getContractInstance(
        Addresses[activeChain]?.usdeAddress,
        tokenAbi
      );

      if (tokenContract) {
        const allowance = await tokenContract.allowance(
          address,
          Addresses[activeChain]?.conversionAddress
        );
        if (allowance.lt(amount)) {
          const tx = await tokenContract.approve(
            Addresses[activeChain]?.conversionAddress,
            amount
          );
          await tx.wait();
        }
      }
      if (conversionContract) {
        await conversionContract.convertUSDetoBuzz(amount);
        await getTokenBalance();
        toast.success("USDe converted to BUZZ successfully", { id });
        return;
      }
    } catch (error) {
      console.log("Error in converting USDe to BUZZ", error);
      toast.error("Error in converting USDe to BUZZ", { id });
    }
  };

  const convertBuzztoUSDe = async (amount: any) => {
    let id = toast.loading("Converting BUZZ to USDe...");
    try {
      amount = ethers.utils.parseEther(amount.toString());
      const conversionContract = await getContractInstance(
        Addresses[activeChain]?.conversionAddress,
        conversionContractAbi
      );

      const tokenContract = await getContractInstance(
        Addresses[activeChain]?.tokenAddress,
        tokenAbi
      );

      if (tokenContract) {
        const allowance = await tokenContract.allowance(
          address,
          Addresses[activeChain]?.conversionAddress
        );
        if (allowance.lt(amount)) {
          const tx = await tokenContract.approve(
            Addresses[activeChain]?.conversionAddress,
            amount
          );
          await tx.wait();
        }
      }
      if (conversionContract) {
        await conversionContract.convertBuzztoUSDe(amount);
        toast.success("BUZZ converted to USDe successfully", { id });
        await getTokenBalance();
        return;
      }
    } catch (error) {
      console.log("Error in converting BUZZ to USDe", error);
      toast.error("Error in converting BUZZ to USDe", { id });
    }
  };

  const mintNft = async () => {
    let id = toast.loading("Minting NFT...");
    try {
      const nftContract = await getContractInstance(
        Addresses[activeChain]?.nftContractAddress,
        nftContractAbi
      );
      if (nftContract) {
        let balance = await nftContract.balanceOf(address);
        if (balance.toNumber() >= 1) {
          toast.error("You already have an NFT", { id });
          return;
        }
        const tx = await nftContract.mintNFT(address, NFT_URI);
        await tx.wait();
        toast.success("NFT minted successfully", { id });
        await isNftMinted();
      }
      return;
    } catch (error) {
      toast.error("Error in minting NFT", { id });
      return;
    }
  };

  const createPool = async (
    pollName: string,
    deadline: number,
    question: string,
    link: string,
    parameter: string,
    keyword: string,
    type: number
  ) => {
    let id = toast.loading("Creating pool...");
    try {
      console.log("Creating pool", ethers.utils.formatEther("100"));
      const mainContract = await getContractInstance(
        Addresses[activeChain]?.mainContractAddress,
        mainContractABI
      );
      if (mainContract) {
        const tx = await mainContract.createPool(
          question,
          link,
          parameter,
          keyword,
          type,
          deadline
        ,{
          from: address,
          value: BigNumber.from(ethers.utils.parseUnits("100","wei")), 
        });
        

        await tx.wait();
        await getPoolsDetails();
        toast.success("Pool created successfully", { id });
      }
      return;
    } catch (error) {
      console.log("Error in creating pool",error);
      toast.error("Error in creating pool", { id });
      return;
    }
  };

  const placeBet = async (
    poolId: number,
    amount: BigNumber,
    predictScore: number
  ) => {
    let id = await toast.loading("Placing bet...");
    try {
      const mainContract = await getContractInstance(
        Addresses[activeChain]?.mainContractAddress,
        mainContractABI
      );
      amount = ethers.utils.parseEther(amount.toString());
      const tokenContract = await getContractInstance(
        Addresses[activeChain]?.tokenAddress,
        tokenAbi
      );
      console.log("tokenContract", tokenContract);
      if (tokenContract) {
        const allowance = await tokenContract.allowance(
          address,
          Addresses[activeChain]?.mainContractAddress
        );
        if (allowance.lt(amount)) {
          const tx = await tokenContract.approve(
            Addresses[activeChain]?.mainContractAddress,
            amount
          );
          await tx.wait();
        }
      }

      if (mainContract) {
        const tx = await mainContract.placeBet(amount, predictScore, poolId);
        await tx.wait();

        await getPoolsDetails();
      }

      toast.success("Bet placed successfully", {
        id,
      });
      return;
    } catch (error) {
      toast.error("Error in placing bet", { id });
      return;
    }
  };

  const claimBet = async (poolId: number) => {
    console.log("Claiming bet", poolId);
    let id = await toast.loading("Claiming bet...");
    try {
      console.log("Claiming bet", Addresses[activeChain]?.mainContractAddress);
      const mainContract = await getContractInstance(
        Addresses[activeChain]?.mainContractAddress,
        mainContractABI
      );
      console.log("mainContract", mainContract);
      if (mainContract) {
        const tx = await mainContract.claimBet(poolId);
        await tx.wait();
        await getPoolsDetails();
        toast.success("Bet claimed successfully", { id });
      }
      return;
    } catch (error) {
      toast.error("Error in claiming bet", { id });
      return;
    }
  };

  const setResultScore = async (poolId: number, finalScore: number) => {
    let id = await toast.loading("Setting result...");
    try {
      const mainContract = await getContractInstance(
        Addresses[activeChain]?.mainContractAddress,
        mainContractABI
      );

      if (mainContract) {
        const tx = await mainContract.setResult(poolId, finalScore);
        await tx.wait();
        toast.success("Result set successfully", { id });
        await getPoolsDetails();
      }
      return;
    } catch (error) {
      console.log("Error in setting result");
      toast.error("Error in setting result", { id });
      return;
    }
  };


  const getPoolsDetails = async () => {
    let poolDetails = {
      pool_data: {
        pools: [] as any,
      } as any,
    };
    setLoading(true);
    try {
      const mainContract = await getContractInstance(
        Addresses[activeChain]?.mainContractAddress,
        mainContractABI
      );
      console.log("mainContract", mainContract);
      let maxPoolId = await mainContract?.getPoolId();
      console.log("maxPoolId", maxPoolId);
      let userBets = [] as any;
      if (mainContract) {
        for (let i = 0; i < maxPoolId; i++) {
          const pool = await mainContract.pools(i);
          let poolObj = {
            poolId: i,
            question: pool.question,
            url: pool.url,
            parameter: pool.parameter,
            category: pool.category,
            poll_type: pool.poll_type,
            total_amount: +pool.total_amount
              .div(BigNumber.from(10).pow(18))
              .toString(),
            total_bets: +pool.total_bets.toString(),
            finalScore: +pool.finalScore.toString(),
            startTime: +pool.startTime.toString(),
            endTime: +pool.endTime.toString(),
            poolEnded: pool.poolEnded,
          };
          poolDetails.pool_data.pools.push(poolObj);
          let bets = await mainContract.getBets(i);
          console.log("bets", bets);
          let poolBets = [];
          for (let y = 0; y < bets.length; y++) {
            let betObj = {
              poolId: i,
              user: bets[y].user,
              amount: +bets[y].amount
                .div(BigNumber.from(10).pow(18))
                .toString(),
              targetScore: +bets[y].targetScore.toString(),
              claimedAmount: +bets[y].claimedAmount.toString(),
              claimed: bets[y].claimed,
              status: pool.poolEnded,
            };
            if (bets[y].user == address) {
              userBets.push(betObj);
            }
            poolBets.push(betObj);
          }
          await setUserBetsData(userBets);
          poolDetails.pool_data.pools[i].bets = poolBets;
        }
        console.log("poolDetails", poolDetails);
        setTotalPools(poolDetails?.pool_data?.pools);
        setLoading(false);
        return poolDetails;
      }
    } catch (error) {
      console.log(error, "Error in getting pool detail");
      setLoading(false);
      return poolDetails;
    }
  };

  const isNftMinted = async () => {
    try {
      const nftContract = await getContractInstance(
        Addresses[activeChain]?.nftContractAddress,
        nftContractAbi
      );
      if (nftContract) {
        let balance = await nftContract.balanceOf(address);
        if (balance.toNumber() >= 1) {
          setNftMintedAllReady(true);
        }
      }
    } catch (error) {
      console.log("Error in getting nft minted");
    }
  };
  useEffect(() => {
    if (!signer) return;
    getTokenBalance();
    getPoolsDetails();
    isNftMinted();
  }, [signer]);

  function formatTimestamp(timestamp: number) {
    const date = new Date(timestamp * 1000); // Convert to milliseconds
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  }

  return (
    <DataContext.Provider
      value={{
        tokenBalance,
        getContractInstance,
        getTokenBalance,
        createPool,
        placeBet,
        claimBet,
        getPoolsDetails,
        totalPools,
        userBetsData,
        loading,
        setResultScore,
        isOpen,
        openSideBar,
        closeSideBar,
        activePoolId,
        setActivePoolId,
        formatTimestamp,
        mintNft,
        nftMintedAllReady,
        convertUSDetoBuzz,
        convertBuzztoUSDe,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useDataContext = () => {
  const context = React.useContext(DataContext);
  if (context === undefined) {
    throw new Error("useDataContext must be used within a DataContextProvider");
  }
  return context;
};

export default DataContextProvider;
