(function(window, angular, undefined) {'use strict';

var module = angular.module("ef-services2", ['lbServices'])

module.factory(
  'CurrentEmploye', 
  function (Employe) {

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
        props.forEach(function (name) {
          self[name] = employe[name]
          save(name, self[name])
        })
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
    var key = '$CurrentEmploye$' + name
    if (value == null) value = ''
    localStorage[key] = value
  }
  
  function load(name) {
    return localStorage['$CurrentEmploye$' + name] || null
  }
});

module.factory(
  'DealTransaction', 
  function (CurrentEmploye, Deal) {

  var props = ['serialNumber', 'seller', 'merchantID', 'shopID', 'quantity', 'fee', 'items', 'bill']
  
  function DealTransaction() {

    props.forEach(function (name) {
      this[name] = load(name)
    }, this)

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
    var exited = this.items.some(function (dealItem) {
      if(item.id === dealItem.item.id) {
        dealItem.quantity++
        this.quantity++
        this.fee += dealItem.dealPrice 
        return true
      } else {
        return false
      }
    }, this)
    if(exited) return
    this.items.push({
      item: {
        id: item.id,
        "name": item.name,
        price: item.price
      },
      dealPrice: item.price,
      quantity: 1
    })        
    this.quantity += 1
    this.fee += item.price 
  }
  
  DealTransaction.prototype.registerItems = function (items) {
    items.forEach(this.registerItem, this)
  }
  
  DealTransaction.prototype.settle = function (successCb, errorCb) {
    var validateSettlement = function (settlement) {
      return settlement && settlement.amount > 0 ? settlement : null
    }
    
    this.bill.amount = this.fee
    this.bill.cashSettlement = validateSettlement(this.bill.cashSettlement)
    this.bill.memberSettlement = validateSettlement(this.bill.memberSettlement)

    var paidAmount = 0
    if(this.bill.cashSettlement) {
      paidAmount += this.bill.cashSettlement.amount
    }
    if(this.bill.memberSettlement) {
      paidAmount += this.bill.memberSettlement.amount
    }
    if(paidAmount < this.bill.amount - this.bill.discountAmount) {
      return errorCb(null, {type: 'danger', msg: '支付金额不足'})
    }
    var entity = {}
    props.forEach(function (name) {
      entity[name] = this[name]
    }, this)
    Deal.create(entity, successCb, function (res) {
      errorCb(res, {type: 'danger', msg: '创建失败'})
    })
  }
  
  return new DealTransaction()

  function save(name, value) {
    var key = '$DealTransaction$' + name
    if (value == null) value = ''
    localStorage[key] = value
  }
  
  function load(name) {
    return localStorage['$DealTransaction$' + name] || null
  }

});

})(window, window.angular);
