'use strict'

angular.module('ef.directives',[])

.directive('efCurrency', ['$filter', function ($filter) {
  return {
    require: 'ngModel',
    link: function (scope, element, attrs, ngModel) {
      
      ngModel.$formatters.push(function (value) {
        return $filter('currency')(value/100, '¥')
      })
      
      ngModel.$parsers.push(function (viewValue) {
        return viewValue*100
      })
      
      element.on("blur", function () {
        element.val($filter('currency')(ngModel.$modelValue/100, '¥'))
      })  
    }
  }
}])

.directive('efDealtype', function () {
  return {
    restrict: 'A',
    link:  function (scope, elem, attrs) {
      var cssClass = 'icon '
      if(attrs.efDealtype === 'deal') {
        cssClass += 'ion-ios7-cart royal'
      } else if(attrs.efDealtype === 'prepay') {
        cssClass += 'ion-ios7-download energized'
      } else {
        cssClass += 'ion-ios7-backspace'
      }
      
      elem.addClass(cssClass)
    }
  }
})