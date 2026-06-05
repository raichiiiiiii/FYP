//go:build fabric

package main

import "github.com/hyperledger/fabric-contract-api-go/v2/contractapi"

func main() {
	chaincode, err := contractapi.NewChaincode(new(AuditAnchorContract))
	if err != nil {
		panic(err)
	}

	if err := chaincode.Start(); err != nil {
		panic(err)
	}
}
