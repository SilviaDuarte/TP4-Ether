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

    document.getElementById("status").innerHTML = "Estado: <span class='font-semibold text-green-600'>Conectado</span>";
    document.getElementById("btnConnect").classList.add("hidden");
    document.getElementById("btnDisconnect").classList.remove("hidden");
    document.getElementById("mainContent").classList.remove("hidden");

    userAddress = await signer.getAddress();
    await updateSignerInfo();
    await updatePoolInfo();
}

//Informacion del user
async function updateSignerInfo(){
    tokenABalance = await tokenAContract.balanceOf(userAddress);
    tokenBBalance = await tokenBContract.balanceOf(userAddress);
    document.getElementById("tokenABalance").style.display = "block";
        document.getElementById("tokenABalance").innerText = `Balance TokenA: ${ethers.formatUnits(tokenABalance, 18)}`;
        document.getElementById("tokenBBalance").style.display = "block";
        document.getElementById("tokenBBalance").innerText = `Balance TokenB: ${ethers.formatUnits(tokenBBalance, 18)}`;

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

            const formattedLiquidityA = ethers.formatUnits(liquidityA, decimalsA);
            const formattedLiquidityB = ethers.formatUnits(liquidityB, decimalsB);

            const formattedPriceA = ethers.formatUnits(priceA, decimalsB); // Precio de A en términos de B
            const formattedPriceB = ethers.formatUnits(priceB, decimalsA); // Precio de B en términos de A

            document.getElementById("liquidityTokenA").innerText = `TokenA disponible: ${formattedLiquidityA}`;
            document.getElementById("liquidityTokenB").innerText = `TokenB disponible: ${formattedLiquidityB}`;
            document.getElementById("priceTokenA").innerText = `TokenA = ${formattedPriceA} TKB`;
            document.getElementById("priceTokenB").innerText = `TokenB = ${formattedPriceB} TKA`;
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

        if (swapDirection === "AtoB") {
            // Intercambiar TokenA por TokenB
            await tokenAContract.approve(SIMPLE_DEX_ADDRESS, ethers.parseUnits(amount, 18));
            const tx = await dexContract.swapAforB(ethers.parseUnits(amount, 18));
            await tx.wait();
            alert("Intercambio de TokenA por TokenB realizado exitosamente!");
        } else if (swapDirection === "BtoA") {
            // Intercambiar TokenB por TokenA
            await tokenBContract.approve(SIMPLE_DEX_ADDRESS, ethers.parseUnits(amount, 18));
            const tx = await dexContract.swapBforA(ethers.parseUnits(amount, 18));
            await tx.wait();
            alert("Intercambio de TokenB por TokenA realizado exitosamente!");
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

        await tokenAContract.approve(SIMPLE_DEX_ADDRESS, ethers.parseUnits(amountA, 18));
        await tokenBContract.approve(SIMPLE_DEX_ADDRESS, ethers.parseUnits(amountB, 18));

        const tx = await dexContract.addLiquidity(ethers.parseUnits(amountA, 18), ethers.parseUnits(amountB, 18));
        await tx.wait();
        alert(`Liquidez añadida exitosamente: ${amountA}TKA y ${amountB}TKB`);
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
            // Convierte los montos a unidades apropiadas (ejemplo: 18 decimales)
            const parsedAmountA = ethers.parseUnits(amountA, 18);
            const parsedAmountB = ethers.parseUnits(amountB, 18);

            // Llama a la función removeLiquidity del contrato
            const tx = await dexContract.removeLiquidity(parsedAmountA, parsedAmountB);
            await tx.wait();

            alert(`Liquidez retirada exitosamente: ${amountA}TKA y ${amountB}TKB`);
            // Limpiar los campos del formulario
            document.getElementById("removeTokenAAmount").value = "";
            document.getElementById("removeTokenBAmount").value = "";
            // Actualizar los datos del pool y balances del signer después de la eliminación
            await updateSignerInfo(); 
            await updatePoolInfo();
        } catch (error) {
            console.error("Error al eliminar liquidez:", error);
            alert("No se pudo eliminar la liquidez. Revisa la consola para más detalles.");
        }
}
async function disconnectWallet() {
    provider = null;
    signer = null;

    statusText.innerHTML = "Estado: <span class='font-semibold text-red-600'>Desconectado</span>";
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
