import listOrders from './listOrders';

type AppSyncEvent = {
  info: {
    fieldName: string;
  };
  arguments: {
    orderId: string;
  };
}

exports.handler = async (event:AppSyncEvent) => {
  return listOrders(event.arguments.orderId);
};