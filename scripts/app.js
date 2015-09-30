'use strict';

var types = [
  'TransactionEnvelope',
  'TransactionResult',
  '---',
  'PublicKey',
  'CryptoKeyType',
  'AccountId',
  'Uint64',
  'SequenceNumber',
  'AssetType',
  'AssetAlphaNum4',
  'AssetAlphaNum12',
  'Asset',
  'Price',
  'ThresholdIndices',
  'LedgerEntryType',
  'Signer',
  'AccountFlags',
  'AccountEntryExt',
  'AccountEntry',
  'Int64',
  'TrustLineFlags',
  'TrustLineEntryExt',
  'TrustLineEntry',
  'OfferEntryFlags',
  'OfferEntryExt',
  'OfferEntry',
  'LedgerEntryData',
  'LedgerEntryExt',
  'LedgerEntry',
  'EnvelopeType',
  'StellarValueExt',
  'StellarValue',
  'LedgerHeaderExt',
  'LedgerHeader',
  'LedgerUpgradeType',
  'LedgerUpgrade',
  'LedgerKeyAccount',
  'LedgerKeyTrustLine',
  'LedgerKeyOffer',
  'LedgerKey',
  'BucketEntryType',
  'BucketEntry',
  'TransactionSet',
  'Transaction',
  'TimeBounds',
  'Memo',
  'MemoType',
  'Operation',
  'OperationBody',
  'OperationType',
  'CreateAccountOp',
  'PaymentOp',
  'PathPaymentOp',
  'ManageOfferOp',
  'CreatePassiveOfferOp',
  'SetOptionsOp',
  'ChangeTrustOp',
  'AllowTrustOp',
  'AllowTrustOpAsset',
  'TransactionExt',
  'DecoratedSignature',
  'TransactionResultPair',
  'TransactionResultResult',
  'TransactionResultCode',
  'OperationResult',
  'OperationResultCode',
  'OperationResultTr',
  'CreateAccountResult',
  'CreateAccountResultCode',
  'PaymentResult',
  'PaymentResultCode',
  'PathPaymentResult',
  'PathPaymentResultCode',
  'PathPaymentResultSuccess',
  'ClaimOfferAtom',
  'SimplePaymentResult',
  'ManageOfferResult',
  'ManageOfferResultCode',
  'ManageOfferSuccessResult',
  'ManageOfferSuccessResultOffer',
  'ManageOfferEffect',
  'SetOptionsResult',
  'SetOptionsResultCode',
  'ChangeTrustResult',
  'ChangeTrustResultCode',
  'AllowTrustResult',
  'AllowTrustResultCode',
  'AccountMergeResult',
  'AccountMergeResultCode',
  'InflationResult',
  'InflationResultCode',
  'InflationPayout',
  'TransactionResultExt',
  'TransactionResultSet',
  'TransactionHistoryEntryExt',
  'TransactionHistoryEntry',
  'TransactionHistoryResultEntryExt',
  'TransactionHistoryResultEntry',
  'LedgerHeaderHistoryEntryExt',
  'LedgerHeaderHistoryEntry',
  'LedgerEntryChangeType',
  'LedgerEntryChange',
  'OperationMeta',
  'TransactionMeta',
  'Error',
  'Hello',
  'NodeId',
  'Auth',
  'PeerAddress',
  'MessageType',
  'DontHave',
  'StellarMessage',
  'ScpQuorumSet',
  'ScpEnvelope',
  'ScpStatement',
  'ScpStatementPledges',
  'ScpStatementType',
  'ScpStatementPrepare',
  'ScpBallot',
  'ScpStatementConfirm',
  'ScpStatementExternalize',
  'ScpNomination'
];

$(document).ready(function() {
  $.each(types, function(key, value) {
    $('#type')
      .append($("<option></option>").text(value));
  });
});

function getLatestTransaction(event) {
  hideAlert();
  event.preventDefault();
  var server = new StellarSdk.Server({hostname:'horizon-testnet.stellar.org', secure:true, port:443});
  server.transactions()
    .limit(1)
    .order('desc')
    .call()
    .then(function(response) {
      $('#type').val('TransactionEnvelope');
      $('#xdr').val(response.records[0].envelope_xdr);
      newXDR();
    })
    .catch(function () {
      showAlert('Error getting data from Horizon.');
    });
}

function newXDR() {
  hideAlert();

  var type = $('#type').val();
  if (type == '---') {
    showAlert('Invalid type.');
    return;
  }

  var xdr = $('#xdr').val();
  if (!xdr) {
    return;
  }

  try {
    var object = StellarSdk.xdr[type].fromXDR(xdr, 'base64');
  } catch(error) {
    $('#tree').empty();
    showAlert('Input is invalid.');
    return;
  }

  var tree = [{}];
  buildTreeFromObject(object, tree[0], type);
  $('#tree').treeview({
    data: tree,
    levels: 5,
    showTags: true,
    highlightSelected: false
  });
}

function buildTreeFromObject(object, anchor, name) {
  anchor.text = name;
  anchor.icon = getIcon(name);

  if (_.isArray(object)) {
    parseArray(anchor, object);
  } else if (!hasChildren(object)) {
    anchor.text += ' = '+getValue(object, name);
  } else if (object.switch) {
    parseArm(anchor, object)
  } else {
    parseNormal(anchor, object)
  }
}

function parseArray(anchor, object) {
  anchor.tags = [object.length];
  anchor.nodes = [];
  for (var i = 0; i < object.length; i++) {
    anchor.nodes.push({});
    buildTreeFromObject(object[i], anchor.nodes[anchor.nodes.length-1], i);
  }
}

function parseArm(anchor, object) {
  anchor.text += ' ['+object.switch().name+']';
  if (_.isString(object.arm())) {
    anchor.nodes = [{}];
    buildTreeFromObject(object[object.arm()](), anchor.nodes[anchor.nodes.length-1], object.arm());
  }
}

function parseNormal(anchor, object) {
  anchor.nodes = [];
  _(object).functions().without('toXDR', 'ext').value().forEach(function(name) {
    anchor.nodes.push({});
    buildTreeFromObject(object[name](), anchor.nodes[anchor.nodes.length-1], name);
  });
}

function hasChildren(object) {
  // string
  if (_.isString(object)) {
    return false;
  }
  // node buffer
  if (object && object._isBuffer) {
    return false;
  }
  var functions = _(object).functions();
  if (functions.value().length == 0) {
    return false;
  }
  // int64
  if (functions.include('getLowBits') && functions.include('getHighBits')) {
    return false;
  }
  return true;
}

function getValue(object, name) {
  if (name === 'ed25519') {
    var address = StellarSdk.encodeCheck("accountId", object);
    var short = address.substr(0, 10);
    return '<a href="https://horizon-testnet.stellar.org/accounts/'+address+'" title="'+address+'" target="_blank">'+short+'</a>';
  }

  if (name === 'assetCode' || name === 'assetCode4' || name === 'assetCode12') {
    return object.toString();
  }

  var value = object;
  if (object && object._isBuffer) {
    value = '&lt;buffer&gt;';
  }
  return value;
}

function getIcon(name) {
  switch (name) {
    case 'sourceAccount':
    case 'destination':
      return 'glyphicon glyphicon-user';
    default:
      return '';
  }
}

function hideAlert() {
  $('#alert').addClass('hidden');
}

function showAlert(text) {
  $('#alert').removeClass('hidden');
  $('#alert-text').text(text);
}
