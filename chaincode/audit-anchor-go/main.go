//go:build !fabric

package main

import (
	"log"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

func main() {
	chaincode, err := contractapi.NewChaincode(new(AuditAnchorContract))
	if err != nil {
		log.Panicf("create audit-anchor chaincode: %v", err)
	}

	if err := chaincode.Start(); err != nil {
		log.Panicf("start audit-anchor chaincode: %v", err)
	}
}
