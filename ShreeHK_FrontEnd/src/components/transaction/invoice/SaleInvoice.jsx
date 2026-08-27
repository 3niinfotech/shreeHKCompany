import React, { useMemo } from "react";
import { buildVenyaInvoiceBody } from "../../../utils/venyaInvoiceTemplate";

const SaleInvoice = ({ includeCustomerCopy = true, ...data }) => {
  const html = useMemo(() => {
    return buildVenyaInvoiceBody(data, { includeCustomerCopy });
  }, [data, includeCustomerCopy]);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
};

export default SaleInvoice;
