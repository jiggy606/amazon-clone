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
    const [recentTransactions, setRecentTransactions] = useState([])
    const [ownedItems, setOwnedItems] = useState([])

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

    const {
        data: userData,
        error: userDataError,
        isLoading: userDataIsLoading,
    } = useMoralisQuery('_User')

    const getAssets = async () => {
        try {
            await enableWeb3()
            setAssets(assetsData)
        } catch (error) {
            console.log(error)
        }
    }

    const listenToUpdates = async () => {
        let query = new Moralis.Query('EthTransactions')
        let subscription = await query.subscribe()
        subscription.on('update', async object => {
        console.log('New Transactions')
        console.log(object)
        setRecentTransactions([object])
        })
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

    const buyAsset = async (price, asset) => {
        try {
           if (!isAuthenticated) return
           // console.log('price: ', price)
           // console.log('asset: ', asset.name)
           // console.log(userData) 
            
            const options = {
                type: 'erc20',
                amount: price,
                receiver: amazonCoinAddress,
                contractAddress: amazonCoinAddress,
            }

            let transaction = await Moralis.transfer(options)
            const receipt = await transaction.wait()

            if (receipt) {
                const res = userData[0].add('ownedAssets', {
                    ...asset,
                    purchaseDate: Date.now(),
                    etherscanLink: `https://rinkeby.etherscan.io/tx/${receipt.transactionHash}`,
                })
                await res.save().then(() => {
                    alert("You've successfully bought this asset!")
                })
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
                await listenToUpdates()
                const currentUsername = await user?.get('nickname')
                setUsername(currentUsername) 
                const account = await user?.get('ethAddress')
                setCurrentAccount(account)
            }
        })()
    }, [isAuthenticated, user, username, currentAccount, getBalance, listenToUpdates])

    useEffect(() => {
        ; (async () => {
            if (isWeb3Enabled) {
                await getOwnedAssets()
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

    const getOwnedAssets = async () => {
        try {
            if (userData[0]) {
                setOwnedItems(prevItems => [
                    ...prevItems, userData[0].attributes.ownedAsset,
                ])
            }
        } catch (error) {
            console.log(error)
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
                currentAccount,
                buyTokens,
                buyAsset,
                recentTransactions,
                listenToUpdates,
                ownedItems,
            }}
        >
            {children}
        </AmazonContext.Provider>
    )
}