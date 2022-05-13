import { createContext, useState, useEffect} from "react";
import { useMoralis, useMoralisQuery } from "react-moralis";
import { amazonAbi, amazonCoinAddress } from '../lib/constants'
import { ethers } from "ethers";

export const AmazonContext = createContext()

export const AmazonProvider = ({ children }) => {
    const [username, setUsername] = useState('')
    const [nickname, setNickname] = useState('')
    const [assets, setAssets] = useState([])
    const [currentAccount, setCurrentAccount] = useState('')
    const [tokenAmount, setTokenAmount] = useState('')
    const [amountDue, setAmountDue] = useState('')
    const [etherscanLink, setEtherscanLink] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [balance, setBalance] = useState('')

    const {
        authenticate,
        isAuthenticated,
        enableWeb3,
        Moralis,
        user,
        isWeb3Enabled,
    } = useMoralis()

    const {
        data: assetsData,
        error: assetsDataError,
        isLoading: assetsDataisLoading,
    } = useMoralisQuery('assets')

    const getAssets = async () => {
        try {
            await enableWeb3()
            setAssets(assetsData)
        } catch (error) {
            console.log(error)
        }
    }

    const getBalance = async () => {
        try {
            if (!isAuthenticated || !currentAccount) return
            const options = {
                contractAddress: amazonCoinAddress,
                functionName: 'balanceOf',
                abi: amazonAbi,
                params: {
                    account: currentAccount
                },
            }

            if (isWeb3Enabled) {
                const response = await Moralis.executeFunction(options)
                setBalance(response.toString())
            }
        } catch (error) {
            console.log(error)
        }
    }

    const buyTokens = async () => {
        if (!isAuthenticated) {
            await authenticate()
        }

        const amount = ethers.BigNumber.from(tokenAmount)
        const price = ethers.BigNumber.from('100000000000000')
        const calcPrice = amount.mul(price)

        let options = {
            contractAddress: amazonCoinAddress,
            functionName: 'mint',
            abi: amazonAbi,
            msgValue: calcPrice,
            params: {
                amount,
            },
        }
        const transaction = await Moralis.executeFunction(options)
        const receipt = await transaction.wait(4)
        setIsLoading(false)
        console.log(receipt)
        setEtherscanLink(
            `https://rinkeby.etherscan.io/tx/${receipt.transactionHash}`,
        )
    }

    useEffect(() => {  
        ; (async () => {
            if (isAuthenticated) {
                await getBalance()
                const currentUsername = await user?.get('nickname')
                setUsername(currentUsername) 
                const account = await user?.get('ethAddress')
                setCurrentAccount(account)
            }
        })()
    }, [isAuthenticated, user, username, currentAccount])

    useEffect(() => {
        ; (async () => {
            if (isWeb3Enabled) {
                await getAssets()
            }
        })()
    }, [isWeb3Enabled, assetsData, assetsDataisLoading])

    const handleSetUsername = () => {
        if (user) {
            if (nickname) {
                user.set('nickname', nickname)
                user.save()
                setNickname('')
            } else {
                console.log('Cannot have empty nickname')
            }
        } else {
            console.log('There is no user')
        }
    }

    return (
        <AmazonContext.Provider
            value={{
                isAuthenticated,
                nickname,
                setNickname,
                username,
                handleSetUsername,
                assets,
                balance,
                setTokenAmount,
                amountDue,
                setAmountDue,
                isLoading,
                setIsLoading,
                etherscanLink,
                setEtherscanLink,
                currentAccount
            }}
        >
            {children}
        </AmazonContext.Provider>
    )
}