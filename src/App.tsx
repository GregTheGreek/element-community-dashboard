import React, {useState} from 'react';
import './App.css';
import {ethers} from "ethers";
import Ethers from "ethers";
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import { Button } from '@mui/material';
import { ApolloClient, InMemoryCache, gql } from '@apollo/client'

// The Graph
interface Voter {
  id: string;
  numberOfDelegations: string;
  votingPower: string;
}
const GRAPH_URL = "https://api.thegraph.com/subgraphs/name/mattiaslightstone/element-voting-power";
const client = new ApolloClient({
  uri: GRAPH_URL,
  cache: new InMemoryCache(),
})
const tokensQuery = `
  query {
    voters(first: 1000, skip: 0, orderBy: votingPower, orderDirection: desc, where: {id_not: "0x0000000000000000000000000000000000000001"}) {
      id
      numberOfDelegations
      votingPower
    }
  }
`
// Table stuff
interface RowData {
  id: string;
  address: string;
  votingPower: string;
  totalDelegations: number;
  gsc: string | null;
}
const columns = [
  // @ts-ignore
  { field: 'address', headerName: 'Address or ENS', width: 450 },
  { field: 'votingPower', headerName: 'Voting Power', width: 300},
  { field: 'totalDelegations', headerName: 'Total Delegations', width: 150},
  { field: 'gsc', headerName: 'Is GSC', width: 150},
];

export default function BasicExampleDataGrid() {
  const [provider, setProvider] = useState<undefined | Ethers.providers.Web3Provider>(undefined);
  const [rowData, setRowData] = useState<RowData[]>([]);
  
  async function connectToMetamask() {
    // @ts-ignore
    if (typeof window.ethereum !== 'undefined' && !provider) {
      // @ts-ignore
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      setProvider(provider);
      fetchData();
    } else {
      await fetchData();
    }
  }

  async function fetchData() {
    try {
      const {data} = await client.query({query: gql(tokensQuery)});
      const promises: RowData[] = data.voters.map(async (x: Voter) => {
      let ensName;
      if (provider) {
        ensName = await provider.lookupAddress(x.id); 
      }
      return {
          id: x.id,
          address: ensName || x.id,
          votingPower: ethers.utils.formatUnits(x.votingPower),
          totalDelegations: Number(x.numberOfDelegations),
          gsc: null
        } as RowData;
      })
      let rows = await Promise.all(promises);
      // Sketchy but works
      rows.sort((a,b) => Number(b.votingPower) - Number(a.votingPower))
      rows = rows.map((x: RowData) => {
        const gsc = Number(x.votingPower) > 110000 ? "Yes" : null;
        return {
          ...x,
          votingPower: ethers.utils.commify(x.votingPower),
          gsc
        }
      })
      setRowData(rows);
    } catch (e) {
      console.log('Error fetching data: ', e);
    }
  }

  return (
    <div className='App'>
      <h1 style={{alignSelf: "left"}}>Element Finance Delegate Dashboard</h1>
      <div style={{width: "80%", height: "100%"}}>
        <Button
          onClick={connectToMetamask}
        >
          {!provider ? "Connect to Metamask" : "Refresh"}
        </Button>
        <DataGrid
          components={{Toolbar: GridToolbar}}
          columns={columns}
          rows={rowData}
        />
        <p>Made by <a target="_" href="https://github.com/GregTheGreek">GregTheGreek</a></p>
        <p>Delegate to me: <a target="_" href="https://etherscan.io/address/0x7AE8b0D6353F0931EB9FaC0A3562fA9e4C6Ff933">0x7AE8b0D6353F0931EB9FaC0A3562fA9e4C6Ff933</a></p>
      </div>
    </div>
  );
}
