(function(window, angular, undefined) {'use strict';

var module = angular.module("ef-services2", ['lbServices'])

module.factory(
  'CurrentEmploye', 
  function (Employe, $rootScope) {

  var props = ['id', 'name', 'merchantID', 'shopID', 'merchant', 'shop']
  
  function CurrentEmploye() {
    props.forEach(function (name) {
      this[name] = load(name)
    }, this)
  }
  
  CurrentEmploye.prototype.save = function () {
    props.forEach(function (name) {
      save(name, this[name])
    }, this)
  }
  
  CurrentEmploye.prototype.setEmploye = function (user) {
    if(user.employeID) {
      var self = this
      Employe.findOne({
        filter:{
          where:{id:user.employeID}, 
          include:['merchant', 'shop']
        }
      }, function (employe) {
        props = Object.keys(employe)
        props.forEach(function (name) {
          self[name] = employe[name]
          save(name, self[name])
        })
        $rootScope.boardcast('CURRENT_EMPLOYE_READY')
      }, function (res) {
        console.log('Find employe error')
      })
    }
  }
  
  CurrentEmploye.prototype.clearEmploye = function () {
    props.forEach(function (name) {
      this[name] = null
      save(name)
    }, this)
  }
  
  return new CurrentEmploye()
  
  function save(name, value) {
    var key = '$EFCurrentEmploye$' + name
    localStorage[key] = value || ''
  }
  
  function load(name) {
    return localStorage['$EFCurrentEmploye$' + name] || null
  }
});

module.factory(
  'DealTransaction', 
  function (CurrentEmploye, Deal) {

  var props = ['serialNumber', 'seller', 'merchantID', 'shopID', 'quantity', 'fee', 'items', 'bill', 'member', 'buyer']
  
  function DealTransaction() {
    props.forEach(function (name) {
      this[name] = load(name)
    }, this)

    this.initDealTransaction()
  }
  
  DealTransaction.prototype.initDealTransaction = function () {
    var now = Date.now()
    var employe = CurrentEmploye
    this.merchantID =  this.merchantID || employe.merchantID,
    this.shopID = this.shopID || employe.shopID,
    this.seller = this.seller || {
      employeID: employe.id, 
      jobNumber: employe.jobNumber,
      "name": employe.name
    }
    this.serialNumber = this.serialNumber || now
    this.quantity = this.quantity || 0
    this.fee = this.fee || 0
    this.items = this.items || []
    this.bill = this.bill || {
      amount: 0,
      discountAmount: 0,
      billNumber: now,
      shopID: employe.shopID,
      merchantID: employe.merchantID,
      agentID: employe.id,
      dealType: 'deal',
      cashSettlement: {
        "status": 'closed',
        serialNumber: now,
        amount: 0,
        settledAt: now,
        payType: 'cash'
      }
    }
  }
  
  DealTransaction.prototype.setMember = function (member) {    
    if(!member) {
      this.bill.memberSettlement = null
      this.buyer = null
    } else {
      var now = Date.now()

      this.buyer = {
        "name": member.name,
        code: member.code,
        memberID: member.id
      }
      
      this.bill.memberSettlement = {
        "status": 'closed',
        serialNumber: now,
        amount: 0,
        settledAt: now,
        payType: 'perpay',
        payerAccount: member.account
      }
    }
  }

  DealTransaction.prototype.registerItem = function (item) {
    var found = this.items.some(function (dealItem) {
      if(item.id === dealItem.item.id) {
        dealItem.quantity++
        this.quantity++
        this.fee += dealItem.dealPrice 
        return true
      } else {
        return false
      }
    }, this)
    if(!found) {
      var dealItem = {
        id: uuid.v4(),
        dealPrice: item.price,
        quantity: 1,
        item: {
          "name": item.name,
          id: item.id,
          price: item.price
        }
      }
      this.items.push(dealItem)
      this.quantity += 1
      this.fee += dealItem.dealPrice
    }
  }
  
  DealTransaction.prototype.registerItems = function (items) {
    items.forEach(this.registerItem, this)
  }
  
  DealTransaction.prototype.account = function () {
    this.bill.amount = this.fee
    this.bill.discountAmount = this.bill.discountAmount || 0
    var payableAmount = this.payableAmount()
    if(this.bill.memberSettlement) {
      this.bill.memberSettlement.amount = payableAmount > this.bill.memberSettlement.payerAccount.balance ?  this.bill.memberSettlement.payerAccount.balance : payableAmount
      payableAmount -= this.bill.memberSettlement.amount
    }
    this.bill.cashSettlement.amount = payableAmount
    
  }
  
  DealTransaction.prototype.payableAmount = function () {
    return this.bill.amount-this.bill.discountAmount
  }
  
  DealTransaction.prototype.change = function () {
    var change = this.payableAmount()
    change -= this.bill.memberSettlement && this.bill.memberSettlement.amount || 0
    change -= this.bill.cashSettlement && this.bill.cashSettlement.amount || 0
    return 0-change
  }

  DealTransaction.prototype.settle = function (successCb, errorCb) {
    var validateSettlement = function (settlement) {
      return settlement && settlement.amount > 0 ? settlement : null
    }
    
    this.bill.amount = this.bill.amount || this.fee

    if(this.bill.memberSettlement &&
      this.bill.memberSettlement.payerAccount &&
      this.bill.memberSettlement.payerAccount.balance < this.bill.memberSettlement.amount) {
      return errorCb(null, {type: 'danger', msg: '客户储值账户余额不足'})
    }
    
    var paidAmount = this.bill.cashSettlement && this.bill.cashSettlement.amount || 0
    paidAmount += this.bill.memberSettlement && this.bill.memberSettlement.amount || 0

    if(paidAmount < this.bill.amount - this.bill.discountAmount) {
      return errorCb(null, {type: 'danger', msg: '付款金额不足'})
    }

    this.bill.cashSettlement = validateSettlement(this.bill.cashSettlement)
    this.bill.memberSettlement = validateSettlement(this.bill.memberSettlement)

    var entity = {}
    props.forEach(function (name) {
      entity[name] = this[name]
    }, this)
    
    var self = this
    Deal.create(entity, function (value, responseHeader) {
      self.close()
      successCb(arguments)
    }, function (res) {
      var error = {type: 'danger', msg: '交易不合规'}
      if(res.status >= 500) {
        error.msg = '网络服务不可用'
      }
      errorCb(res, error)
    })
  }
  
  DealTransaction.prototype.close = function () {
    
    props.forEach(function (name) {
      this[name] = null
      save(name, null)
    }, this)
    
    this.initDealTransaction()
  }
  
  return new DealTransaction()

  function save(name, value) {
    var key = '$EFDealTransaction$' + name
    localStorage[key] = value || ''
  }
  
  function load(name) {
    return localStorage['$EFDealTransaction$' + name] || null
  }

})
  
})(window, window.angular);
