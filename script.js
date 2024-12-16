import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";

const TOKEN_A_ADDRESS = "0x92Bb3ae4F7Ced5f5d79dc771CDcb3D32a276530A"; 
const TOKEN_B_ADDRESS = "0x577a2430D14167e08ADf0D672CA1405370414dF3"; 
const SIMPLE_DEX_ADDRESS = "0x9d1ad60f354F6572E79228AD083271aa0C28bca1"; 

let provider, signer, tokenAContract, tokenBContract, dexContract, userAddress, tokenABalance, tokenBBalance;
let swapDirection = "AtoB";

// Funciones auxiliares...
async function loadABI(url) {
    const response = await fetch(url);
    return response.json();
}

async function connectWallet() {
    if (!window.ethereum) {
        alert("Por favor instala Metamask");
        return;
    }

    await window.ethereum.request({ method: "eth_requestAccounts" });
    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    const abiERC20 = await loadABI("https://gist.githubusercontent.com/veox/8800debbf56e24718f9f483e1e40c35c/raw/f853187315486225002ba56e5283c1dba0556e6f/erc20.abi.json");
    const abiSimpleDEX = await loadABI("./SimpleDEX_ABI.json");

    tokenAContract = new ethers.Contract(TOKEN_A_ADDRESS, abiERC20, signer);
    tokenBContract = new ethers.Contract(TOKEN_B_ADDRESS, abiERC20, signer);
    dexContract = new ethers.Contract(SIMPLE_DEX_ADDRESS, abiSimpleDEX, signer);

    userAddress = await signer.getAddress();
    document.getElementById("status").innerHTML = `Conectado a <span class='font-semibold text-green-900'>${userAddress}</span>`;
    document.getElementById("btnConnect").classList.add("hidden");
    document.getElementById("btnDisconnect").classList.remove("hidden");
    document.getElementById("mainContent").classList.remove("hidden");
   
    await updateSignerInfo();
    await updatePoolInfo();
}

//Informacion del user
async function updateSignerInfo(){
    tokenABalance = await tokenAContract.balanceOf(userAddress);
    tokenBBalance = await tokenBContract.balanceOf(userAddress);
    document.getElementById("tokenABalance").style.display = "block";
        document.getElementById("tokenABalance").innerText = `Balance TokenA: ${ethers.formatUnits(tokenABalance, 1)} wTKA`;
        document.getElementById("tokenBBalance").style.display = "block";
        document.getElementById("tokenBBalance").innerText = `Balance TokenB: ${ethers.formatUnits(tokenBBalance, 1)} wTKB`;

}

//Información del pool
async function updatePoolInfo() {
        try {
            const liquidityA = await tokenAContract.balanceOf(SIMPLE_DEX_ADDRESS);
            const liquidityB = await tokenBContract.balanceOf(SIMPLE_DEX_ADDRESS);

            const priceA = await dexContract.getPrice(TOKEN_A_ADDRESS);
            const priceB = await dexContract.getPrice(TOKEN_B_ADDRESS);

            const decimalsA = await tokenAContract.decimals();
            const decimalsB = await tokenBContract.decimals();

            const formattedLiquidityA = ethers.formatUnits(liquidityA, 1);
            const formattedLiquidityB = ethers.formatUnits(liquidityB, 1);

            const formattedPriceA = ethers.formatUnits(priceA, decimalsB); // Precio de A en términos de B
            const formattedPriceB = ethers.formatUnits(priceB, decimalsA); // Precio de B en términos de A

            document.getElementById("liquidityTokenA").innerText = `TokenA disponible: ${formattedLiquidityA} wTKA`;
            document.getElementById("liquidityTokenB").innerText = `TokenB disponible: ${formattedLiquidityB} wTKB`;
            document.getElementById("priceTokenA").innerText = `TokenA = ${parseFloat(formattedPriceA).toFixed(2)} TKB`;
            document.getElementById("priceTokenB").innerText = `TokenB = ${parseFloat(formattedPriceB).toFixed(2)} TKA`;
        } catch (error) {
            console.error("Error actualizando información del pool:", error);
            alert("No se pudo actualizar la información del pool. Revisa la consola para más detalles.");
        }
    }
             
// Modificar título del formulario según la dirección del intercambio
function updateSwapTitle() {
        const swapTitle = document.getElementById("swapTitle");
        if (swapDirection === "AtoB") {
            swapTitle.innerText = "Intercambiar TokenA por TokenB";
        } else {
            swapTitle.innerText = "Intercambiar TokenB por TokenA";
        }
    }

async function swapTokens() {
        const amount = document.getElementById("swapAmount").value;

        try{
            if (swapDirection === "AtoB") {
                // Intercambiar TokenA por TokenB
                await tokenAContract.approve(SIMPLE_DEX_ADDRESS, ethers.parseUnits(amount, 1));
                const tx = await dexContract.swapAforB(ethers.parseUnits(amount, 1));
                await tx.wait();
                alert("Intercambio de TokenA por TokenB realizado exitosamente!");
            } else if (swapDirection === "BtoA") {
                // Intercambiar TokenB por TokenA
                await tokenBContract.approve(SIMPLE_DEX_ADDRESS, ethers.parseUnits(amount, 1));
                const tx = await dexContract.swapBforA(ethers.parseUnits(amount, 1));
                await tx.wait();
                alert("Intercambio de TokenB por TokenA realizado exitosamente!");
            }
        } catch(error){
            console.error("Error al intercambiar tokens:", error);
            const errorMessage = error.message || error.toString(); const truncatedError = errorMessage.length > 75 ? errorMessage.slice(0, 75) + "...":errorMessage;
            alert(`No se pudo intercambiar tokens. Error: ${truncatedError}`);
        }
        // Limpiar el campo del formulario
        document.getElementById("swapAmount").value = "";
        // Actualizar balances e información del pool
        await updateSignerInfo();
        await updatePoolInfo();
}     
async function addLiquidity() {
        const amountA = document.getElementById("addTokenA").value;
        console.log("AmountA:", amountA); // Check the value of 'amountA'
        const amountB = document.getElementById("addTokenB").value;

        if (!amountA || isNaN(amountA) || parseFloat(amountA) <= 0 || 
        !amountB || isNaN(amountB) || parseFloat(amountB) <= 0) {
        alert("Por favor, introduce cantidades válidas para ambos tokens.");
        return;
        }
        try{
            await tokenAContract.approve(SIMPLE_DEX_ADDRESS, ethers.parseUnits(amountA, 1));
            await tokenBContract.approve(SIMPLE_DEX_ADDRESS, ethers.parseUnits(amountB, 1));

            const tx = await dexContract.addLiquidity(ethers.parseUnits(amountA, 1), ethers.parseUnits(amountB, 1));
            await tx.wait();
        alert(`Liquidez añadida exitosamente: ${amountA} wTKA y ${amountB} wTKB`);
        } catch (error) {
            console.error("Error al añadir liquidez:", error);
            const errorMessage = error.message || error.toString(); const truncatedError = errorMessage.length > 75 ? errorMessage.slice(0, 75) + "...":errorMessage;
            alert(`No se pudo añadir la liquidez. Error: ${truncatedError}`);

        }
        // Limpiar los campos del formulario
        document.getElementById("addTokenA").value = "";
        document.getElementById("addTokenB").value = "";
        // Actualizar los datos del pool y los balances del signer después de añadir liquidez
        await updateSignerInfo(); 
        await updatePoolInfo();
    }

async function removeLiquidity() {
        const amountA = document.getElementById("removeTokenAAmount").value;
        const amountB = document.getElementById("removeTokenBAmount").value;

        if (!amountA || isNaN(amountA) || parseFloat(amountA) <= 0 || 
            !amountB || isNaN(amountB) || parseFloat(amountB) <= 0) {
            alert("Por favor, introduce cantidades válidas para ambos tokens.");
            return;
        }

        try {
            
            const parsedAmountA = ethers.parseUnits(amountA, 1);
            const parsedAmountB = ethers.parseUnits(amountB, 1);

            // Llama a la función removeLiquidity del contrato
            const tx = await dexContract.removeLiquidity(parsedAmountA, parsedAmountB);
            await tx.wait();

            alert(`Liquidez retirada exitosamente: ${amountA} wTKA y ${amountB} wTKB`);
            // Limpiar los campos del formulario
            
        } catch (error) {
            console.error("Error al eliminar liquidez:", error);
            const errorMessage = error.message || error.toString(); const truncatedError = errorMessage.length > 75 ? errorMessage.slice(0, 75) + "...":errorMessage;
            alert(`No se pudo eliminar la liquidez. Error: ${truncatedError}`);
            
        }
        document.getElementById("removeTokenAAmount").value = "";
        document.getElementById("removeTokenBAmount").value = "";
        // Actualizar los datos del pool y balances del signer después de la eliminación
        await updateSignerInfo(); 
        await updatePoolInfo();
}
async function disconnectWallet() {
    provider = null;
    signer = null;

    document.getElementById("status").innerHTML = `Desconectado <span class='font-semibold text-green-600'></span>`;
    //statusText.innerHTML = "Estado: <span class='font-semibold text-red-600'>Desconectado</span>";
    btnConnect.classList.remove('hidden');
    btnDisconnect.classList.add('hidden');
    mainContent.classList.add('hidden'); // Ocultar contenido principal
}

btnConnect.addEventListener('click', () => {            
    connectWallet();           
});

btnDisconnect.addEventListener('click', () => {            
    disconnectWallet();
});

// Manejar cambio de dirección de intercambio        
document.getElementById("btnSwapAtoB").addEventListener("click", () => {
        swapDirection = "AtoB";
        updateSwapTitle();
        document.getElementById("swapFields").style.display = "block";
});
document.getElementById("btnSwapBtoA").addEventListener("click", () => {
        swapDirection = "BtoA";
        updateSwapTitle();
        document.getElementById("swapFields").style.display = "block";
});
document.getElementById("btnAddLiquidity").addEventListener('click', () => {            
    addLiquidity();           
});
document.getElementById("btnRemoveLiquidity").addEventListener('click', () => {            
    removeLiquidity();           
});
document.getElementById("btnSwap").addEventListener('click', () => {            
    swapTokens(); 
});
